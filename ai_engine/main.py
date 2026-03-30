"""
Farmbase AI Engine — FastAPI Server
=====================================
Digital Twin backend for the 12m² PFAL indoor smart farm.

Endpoints:
  POST /api/generate_cad  — Trigger CadQuery to rebuild 3D model + BOM
  WS   /ws                — Real-time state broadcast (physics, biology, robot)
"""

import asyncio
import json
import random
import time
import os
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List, Dict, Any

from physics.thermodynamics import calc_vpd, calc_hvac_load_kw
from robotics.kinematics import AMRHarvester
from biology.yield_model import estimate_strawberry_yield

# Isaac Sim integration
from isaac_bridge.auto_designer import AutoDesigner, DesignRequest
from isaac_bridge.isaac_connector import IsaacConnector

# Autonomous Controller — The Brain
from autonomous_controller import AutonomousController

app = FastAPI(title="Farmbase AI Engine", version="3.0.0 — Autonomous")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FarmEngine:
    """
    Digital Twin Core Engine
    Combines physics, biology, and robotics into a unified state machine.
    """
    
    def __init__(self):
        self.state: Dict[str, Any] = {
            "temp": 20.0,
            "rh": 85.0,
            "co2": 900.0,
            "ec": 1.4,
            "ph": 5.8,
            "ppfd": 450.0,
            "growthDay": 100.0,
            "nightMode": False,
            "timeline": 100.0,
            "isPlaying": False,
            "autoHarvest": False,
        }
        
        self.computed: Dict[str, Any] = {
            "vpd": 0.0,
            "yieldKg": 0.0,
            "energyKwh": 0.0,
            "hvacLoadKw": 0.0,
            "alerts": [],
        }
        
        # Robot: upgraded AMR harvester
        self.harvester = AMRHarvester()
        self.last_update = time.time()
    
    def tick(self):
        now = time.time()
        dt = now - self.last_update
        self.last_update = now
        
        s = self.state
        c = self.computed
        
        t_val = float(s["temp"])
        rh_val = float(s["rh"])
        ppfd_val = float(s["ppfd"])
        co2_val = float(s["co2"])
        day_val = float(s["growthDay"])
        night_val = bool(s["nightMode"])
        timeline_val = float(s["timeline"])
        auto_harvest = bool(s.get("autoHarvest", False))
        
        # 1. Physics
        vpd_val = float(calc_vpd(t_val, rh_val))
        hvac_val = float(calc_hvac_load_kw(t_val, 35.0, 33.6))
        
        c["vpd"] = vpd_val
        c["hvacLoadKw"] = hvac_val
        
        # Energy calculation
        led_w = 0.0 if night_val else (ppfd_val * 0.4 * 12.0)
        hvac_w = hvac_val * 1000.0
        pump_w = 60.0
        hours_on = 0.0 if night_val else 16.0
        c["energyKwh"] = ((led_w + hvac_w + pump_w) * hours_on) / 1000.0
        
        # 2. Biology
        yield_kg = estimate_strawberry_yield(
            t_val, rh_val, co2_val, ppfd_val, int(day_val), night_val
        )
        c["yieldKg"] = yield_kg
        
        # 3. Robotics — AMR Harvester
        if day_val >= 96 and not self.harvester.initialized:
            self.harvester.initialize_berries(yield_kg)
        
        if self.harvester.initialized:
            self.harvester.update_berry_weight(yield_kg)
        
        robot_state = self.harvester.step(
            dt=dt,
            auto_harvest=auto_harvest,
            timeline=timeline_val,
            yield_kg=yield_kg,
        )
        
        # Merge robot state into computed
        c.update(robot_state)
        
        # 4. Alerts
        alerts = []
        if vpd_val < 0.4:
            alerts.append("VPD_LOW_FUNGUS_RISK")
        if vpd_val > 1.2:
            alerts.append("VPD_HIGH_STRESS")
        if t_val > 28:
            alerts.append("TEMP_TOO_HIGH")
        if t_val < 15:
            alerts.append("TEMP_TOO_LOW")
        c["alerts"] = alerts


# Global Engine Instance
engine = FarmEngine()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        msg_str = json.dumps(message, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_str)
            except Exception:
                disconnected.append(connection)
        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════
# REST API Endpoints
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# Isaac Sim Integration
# ═══════════════════════════════════════════════════════════════

auto_designer = AutoDesigner()
isaac_connector = IsaacConnector()


@app.get("/api/isaac/info")
async def isaac_info():
    """Get Isaac Sim installation info and available crops."""
    return {
        "isaac": isaac_connector.info(),
        "available_crops": list(auto_designer.crop_db.keys()),
        "crop_details": {
            k: {"name": v["name"], "name_th": v.get("name_th", ""), "type": v["type"]}
            for k, v in auto_designer.crop_db.items()
        },
    }


@app.post("/api/isaac/design")
async def isaac_design(request: Request):
    """
    AI Auto-Design: generate optimal farm layout.
    
    Body JSON:
      width, depth, height, budget_thb, crop, max_tiers,
      min_aisle_width, has_robot, optimize_for
    """
    body = await request.json()
    
    req = DesignRequest(
        room_width=float(body.get("width", 4.0)),
        room_depth=float(body.get("depth", 3.0)),
        room_height=float(body.get("height", 2.8)),
        budget_thb=float(body.get("budget_thb", 100000)),
        crop=body.get("crop", "tochiotome"),
        max_tiers=int(body.get("max_tiers", 5)),
        min_aisle_width=float(body.get("min_aisle_width", 0.60)),
        has_robot=bool(body.get("has_robot", True)),
        optimize_for=body.get("optimize_for", "yield"),
    )
    
    result = auto_designer.design(req)
    
    if not result.success:
        return {"success": False, "error": result.error}
    
    # Save config for potential Isaac build
    config_path = auto_designer.save_config(result.config)
    
    return {
        "success": True,
        "config": result.config,
        "bom": result.bom,
        "total_cost_thb": result.total_cost_thb,
        "metrics": result.metrics,
        "warnings": result.warnings,
        "config_path": config_path,
    }


@app.post("/api/isaac/build")
async def isaac_build(request: Request):
    """
    Trigger Isaac Sim scene build from config.
    
    Body JSON: either full config dict, or {"config_path": "..."}
    Returns job_id for status tracking.
    """
    if not isaac_connector.available:
        return {
            "success": False,
            "error": "Isaac Sim not found",
            "info": isaac_connector.info(),
        }
    
    body = await request.json()
    
    # Load config from path or use body directly
    config = body
    if "config_path" in body:
        path = body["config_path"]
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        else:
            return {"success": False, "error": f"Config not found: {path}"}
    
    job_id = await isaac_connector.build_scene(config)
    return {"success": True, "job_id": job_id}


@app.get("/api/isaac/status/{job_id}")
async def isaac_status(job_id: str):
    """Get build job status."""
    job = isaac_connector.get_status(job_id)
    if not job:
        return {"error": f"Job {job_id} not found"}
    
    elapsed = (
        (job.finished_at - job.started_at)
        if job.finished_at
        else (time.time() - job.started_at if job.started_at else 0)
    )
    return {
        "id": job.id,
        "status": job.status.value,
        "usd_path": job.usd_path,
        "render_path": job.render_path,
        "error": job.error,
        "elapsed_seconds": round(elapsed, 1),
    }


@app.get("/api/isaac/jobs")
async def isaac_jobs():
    """List all build jobs."""
    return isaac_connector.get_all_jobs()


@app.get("/api/isaac/download/{job_id}")
async def isaac_download(job_id: str):
    """Download USD file for a completed build."""
    job = isaac_connector.get_status(job_id)
    if not job:
        return {"error": f"Job {job_id} not found"}
    if not job.usd_path or not os.path.isfile(job.usd_path):
        return {"error": "USD file not ready"}
    return FileResponse(job.usd_path, filename=os.path.basename(job.usd_path))


# ═══════════════════════════════════════════════════════════════
# Autonomous Control Endpoints
# ═══════════════════════════════════════════════════════════════

auto_brain = AutonomousController()


@app.post("/api/autonomous/toggle")
async def toggle_autonomous(request: Request):
    """Enable or disable autonomous mode."""
    body = await request.json()
    enabled = body.get("enabled", not auto_brain.enabled)
    if enabled:
        auto_brain.enable()
    else:
        auto_brain.disable()
    return {"enabled": auto_brain.enabled, "state": auto_brain.state.value}


@app.get("/api/autonomous/status")
async def autonomous_status():
    """Get full autonomous controller status."""
    return auto_brain._get_status()


@app.get("/api/autonomous/report")
async def autonomous_report():
    """Get detailed report with history."""
    return auto_brain.get_full_report()


@app.post("/api/autonomous/harvest")
async def trigger_harvest():
    """
    Manually trigger a harvest cycle via Cortex Harvester.
    Uses IsaacConnector to spawn the cortex_harvester.py process.
    """
    if not isaac_connector.available:
        return {"error": "Isaac Sim not available"}
    
    job_id = await isaac_connector.run_cortex_harvest()
    return {"job_id": job_id, "status": "started"}


@app.post("/api/autonomous/advance_day")
async def advance_day():
    """Advance the growth model by one day (for testing)."""
    auto_brain.crop.advance_day(
        temp_c=auto_brain.sensors["temperature_c"],
        rh_pct=auto_brain.sensors["humidity_rh"],
        ppfd=450,
    )
    return {
        "day": auto_brain.crop.days_after_sowing,
        "phase": auto_brain.crop.phase.value,
        "should_harvest": auto_brain.crop.should_harvest(),
        "ripe_fraction": round(auto_brain.crop.ripe_fraction, 2),
    }


@app.get("/api/autonomous/anomalies")
async def get_anomalies():
    """Get all detected anomalies."""
    return [a.to_dict() for a in auto_brain.anomalies]


# ═══════════════════════════════════════════════════════════════
# Legacy Endpoints (kept for backward compatibility)
# ═══════════════════════════════════════════════════════════════

@app.post("/api/generate_cad")
async def generate_cad_endpoint(request: Request):
    """Deprecated — use /api/isaac/design instead."""
    return {"success": False, "message": "Moved to /api/isaac/design"}


@app.get("/api/bom")
async def get_bom():
    """Get Blueprint from farm_config.json."""
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "farm_config.json")
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"error": "farm_config.json not found"}


@app.get("/api/download_step")
async def download_step():
    """Deprecated — use /api/isaac/download instead."""
    return {"message": "Use /api/isaac/download/{job_id} instead."}


@app.post("/api/reset_harvester")
async def reset_harvester():
    """Reset the harvester state machine."""
    engine.harvester.reset()
    return {"status": "reset"}


# ═══════════════════════════════════════════════════════════════
# WebSocket
# ═══════════════════════════════════════════════════════════════

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            for k, v in payload.items():
                if k in engine.state:
                    engine.state[k] = v
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ═══════════════════════════════════════════════════════════════
# Background Engine Loop
# ═══════════════════════════════════════════════════════════════

async def engine_loop():
    print("Farmbase AI Engine v3.0 — Autonomous")
    print("   🧠 Autonomous Controller ready")
    print("   🤖 AMR Harvester initialized")
    print("   📡 WebSocket broadcast active")
    while True:
        engine.tick()
        
        # Update autonomous controller
        auto_status = auto_brain.update(
            dt=0.016,
            sensor_data={
                "temperature_c": engine.state.get("temp", 20.0),
                "humidity_rh": engine.state.get("rh", 85.0),
                "co2_ppm": engine.state.get("co2", 900.0),
                "ec_ms_cm": engine.state.get("ec", 1.4),
                "ph": engine.state.get("ph", 5.8),
                "ppfd": engine.state.get("ppfd", 450),
            },
        )
        
        payload = {
            "state": engine.state,
            "computed": engine.computed,
            "autonomous": auto_status,
        }
        await manager.broadcast(payload)
        await asyncio.sleep(0.016)  # ~60fps


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(engine_loop())
    print(f"Isaac Sim: {'Connected' if isaac_connector.available else 'Not found'}")
    if isaac_connector.available:
        print(f"   Version: {isaac_connector.version}")
        print(f"   Path: {isaac_connector.isaac_path}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
