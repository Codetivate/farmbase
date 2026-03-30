"""
Farmbase Autonomous Controller — The Brain
=============================================
Connects ALL subsystems into a single decision loop:
  - Climate PID control (temp, RH, CO2)
  - Growth model tracking (DAS, yield prediction)
  - Harvest scheduling (optimal window detection)
  - Robot command dispatch (via IsaacConnector → Cortex)
  - Anomaly detection & alerting

This is what makes Farmbase AUTONOMOUS —
no human intervention needed from seed to harvest.

Reference:
  - Oishii: fully enclosed single-room system
  - Zordi (NVIDIA partner): digital-twin-first approach
  - Naphrom 2025: Thai smart farm economics
  - Kozai 2016: PFAL environmental control
"""

import asyncio
import json
import math
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ══════════════════════════════════════════════
# PID CONTROLLER
# ══════════════════════════════════════════════

class PIDController:
    """
    Discrete PID controller for climate variables.
    Anti-windup via integral clamping.
    
    Typical usage:
      pid_temp = PIDController(kp=2.0, ki=0.5, kd=0.1, setpoint=20.0,
                                output_min=-1.0, output_max=1.0)
      correction = pid_temp.update(current_temp, dt)
    """

    def __init__(
        self,
        kp: float = 1.0,
        ki: float = 0.1,
        kd: float = 0.05,
        setpoint: float = 0.0,
        output_min: float = -1.0,
        output_max: float = 1.0,
        integral_max: float = 10.0,
    ):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.setpoint = setpoint
        self.output_min = output_min
        self.output_max = output_max
        self.integral_max = integral_max

        self._integral = 0.0
        self._prev_error = 0.0
        self._prev_output = 0.0

    def update(self, measured: float, dt: float) -> float:
        """Calculate PID output. Returns normalized correction [-1, +1]."""
        error = self.setpoint - measured

        # Proportional
        p = self.kp * error

        # Integral with anti-windup
        self._integral += error * dt
        self._integral = max(-self.integral_max, min(self.integral_max, self._integral))
        i = self.ki * self._integral

        # Derivative
        if dt > 0:
            d = self.kd * (error - self._prev_error) / dt
        else:
            d = 0.0
        self._prev_error = error

        # Output clamping
        output = max(self.output_min, min(self.output_max, p + i + d))
        self._prev_output = output
        return output

    def reset(self):
        self._integral = 0.0
        self._prev_error = 0.0


# ══════════════════════════════════════════════
# GROWTH MODEL
# ══════════════════════════════════════════════

class GrowthPhase(str, Enum):
    SEEDLING = "seedling"          # Day 0-14
    VEGETATIVE = "vegetative"      # Day 14-45
    FLOWERING = "flowering"        # Day 45-75
    FRUITING = "fruiting"          # Day 75-100
    RIPENING = "ripening"          # Day 100-120
    HARVEST_READY = "harvest_ready"  # Day 120+

    @property
    def day_range(self) -> Tuple[int, int]:
        """Tochiotome growth phases (days after sowing)."""
        return {
            "seedling": (0, 14),
            "vegetative": (14, 45),
            "flowering": (45, 75),
            "fruiting": (75, 100),
            "ripening": (100, 120),
            "harvest_ready": (120, 999),
        }[self.value]


@dataclass
class CropState:
    """Tracks the biological state of the crop."""
    variety: str = "tochiotome"
    days_after_sowing: int = 0
    phase: GrowthPhase = GrowthPhase.SEEDLING
    health_score: float = 1.0  # 0.0 (dead) to 1.0 (perfect)
    growth_rate: float = 1.0   # multiplier (affected by environment)
    estimated_yield_g: float = 0.0
    total_plants: int = 150
    ripe_fraction: float = 0.0

    def advance_day(self, temp_c: float, rh_pct: float, ppfd: float):
        """
        Advance growth by one day with environmental factors.
        
        Uses a simplified Monteith growth model:
          growth_rate = f(temperature) × f(light) × f(humidity)
        
        Reference: Hidaka 2017, Whitaker 2025
        """
        # Temperature factor (optimum 20°C for Tochiotome)
        t_opt = 20.0
        t_deviation = abs(temp_c - t_opt)
        f_temp = max(0, 1.0 - (t_deviation / 15.0) ** 2)

        # Light factor (optimum 450 µmol/m²/s)
        ppfd_opt = 450
        f_light = min(1.0, ppfd / ppfd_opt)

        # Humidity factor (optimum 80% RH)
        rh_opt = 80
        rh_deviation = abs(rh_pct - rh_opt)
        f_rh = max(0, 1.0 - (rh_deviation / 30.0) ** 2)

        self.growth_rate = f_temp * f_light * f_rh
        self.days_after_sowing += 1

        # Update phase
        for phase in GrowthPhase:
            start, end = phase.day_range
            if start <= self.days_after_sowing < end:
                if self.phase != phase:
                    print(f"  🌱 Phase change: {self.phase.value} → {phase.value}")
                self.phase = phase
                break

        # Update health
        if self.growth_rate < 0.5:
            self.health_score = max(0, self.health_score - 0.02)
        elif self.growth_rate > 0.8:
            self.health_score = min(1.0, self.health_score + 0.005)

        # Estimate yield
        if self.phase in (GrowthPhase.FRUITING, GrowthPhase.RIPENING, GrowthPhase.HARVEST_READY):
            base_yield_per_plant = 25  # grams (Whitaker 2025)
            self.estimated_yield_g = (
                self.total_plants * base_yield_per_plant * 
                self.health_score * self.growth_rate
            )

        # Ripeness progression
        if self.phase == GrowthPhase.RIPENING:
            progress = (self.days_after_sowing - 100) / 20  # 0→1 over 20 days
            self.ripe_fraction = min(1.0, progress * self.growth_rate)
        elif self.phase == GrowthPhase.HARVEST_READY:
            self.ripe_fraction = 1.0

    def should_harvest(self) -> bool:
        """Determine if it's time to harvest."""
        return (
            self.phase in (GrowthPhase.RIPENING, GrowthPhase.HARVEST_READY)
            and self.ripe_fraction >= 0.6
        )


# ══════════════════════════════════════════════
# AUTONOMOUS CONTROLLER STATES
# ══════════════════════════════════════════════

class AutoState(str, Enum):
    DISABLED = "disabled"
    MONITORING = "monitoring"
    GROWING = "growing"
    PRE_HARVEST = "pre_harvest"
    HARVESTING = "harvesting"
    POST_HARVEST = "post_harvest"
    ERROR = "error"


# ══════════════════════════════════════════════
# ANOMALY DETECTION
# ══════════════════════════════════════════════

@dataclass
class Anomaly:
    """A detected anomaly in the system."""
    timestamp: float
    severity: str  # "info", "warning", "critical"
    category: str  # "climate", "robot", "growth", "system"
    message: str
    value: float = 0.0
    threshold: float = 0.0

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "severity": self.severity,
            "category": self.category,
            "message": self.message,
            "value": round(self.value, 2),
            "threshold": round(self.threshold, 2),
        }


# ══════════════════════════════════════════════
# AUTONOMOUS CONTROLLER
# ══════════════════════════════════════════════

class AutonomousController:
    """
    The Farmbase Brain — orchestrates everything.
    
    Decision hierarchy:
    1. Safety checks (temperature extremes, equipment failure)
    2. Climate regulation (PID loops)
    3. Growth tracking (phase detection, health monitoring)
    4. Harvest scheduling (optimal window calculation)
    5. Robot dispatch (Cortex behavior via IsaacConnector)
    
    This is the core innovation that lets a 12m² farm
    outperform a ¥10B factory: ONE brain, ZERO humans.
    """

    def __init__(self, farm_config: Optional[Dict[str, Any]] = None):
        # Load config
        self.config = farm_config or self._load_default_config()
        
        # State
        self.state = AutoState.DISABLED
        self.enabled = False
        self.last_decision_time = 0.0
        self.decision_interval = 1.0  # seconds
        
        # PID controllers for climate
        climate = self.config.get("climate", {})
        self.pid_temp = PIDController(
            kp=2.0, ki=0.5, kd=0.1,
            setpoint=climate.get("temperature_c", 20.0),
            output_min=-1.0, output_max=1.0,
        )
        self.pid_rh = PIDController(
            kp=1.5, ki=0.3, kd=0.05,
            setpoint=climate.get("humidity_rh", 82.5),
            output_min=-1.0, output_max=1.0,
        )
        self.pid_co2 = PIDController(
            kp=0.5, ki=0.1, kd=0.02,
            setpoint=climate.get("target_co2_ppm", 1000.0),
            output_min=-1.0, output_max=1.0,
        )
        
        # PID controllers for irrigation
        irrigation = self.config.get("irrigation_system", {})
        self.pid_ec = PIDController(
            kp=1.0, ki=0.2, kd=0.05,
            setpoint=irrigation.get("target_ec_ms_cm", 1.4),
            output_min=0.0, output_max=1.0,  # Only add nutrients
        )
        self.pid_ph = PIDController(
            kp=1.0, ki=0.2, kd=0.05,
            setpoint=irrigation.get("target_ph", 5.8),
            output_min=-1.0, output_max=0.0,  # Usually only pH Down is needed
        )
        
        # Crop tracking
        crop_cfg = self.config.get("crop", {})
        racks_cfg = self.config.get("racks", {})
        self.crop = CropState(
            variety=crop_cfg.get("variety", "Tochiotome"),
            total_plants=racks_cfg.get("count", 2) * 
                          racks_cfg.get("tiers_per_rack", 5) *
                          racks_cfg.get("plants_per_gutter", 14),
        )
        
        # Sensor data (latest readings)
        self.sensors = {
            "temperature_c": climate.get("target_temperature_day_c", 20.0),
            "humidity_rh": climate.get("target_humidity_rh", 80.0),
            "co2_ppm": climate.get("target_co2_ppm", 1000.0),
            "ppfd": self.config.get("lighting_system", {}).get("target_ppfd_umol", 450),
            "vpd_kpa": 0.8,
            "ec_ms_cm": irrigation.get("target_ec_ms_cm", 1.4),
            "ph": irrigation.get("target_ph", 5.8),
        }
        
        # Actuator output signals
        self.actuators = {
            "ac_power": 0.0,         # -1 (cool max) to +1 (heat max)
            "humidifier": 0.0,       # 0 (off) to 1 (max)
            "exhaust_fan": 0.0,      # 0 (off) to 1 (max)
            "co2_valve": 0.0,        # 0 (closed) to 1 (full open)
            "led_dimmer": 1.0,       # 0 (off) to 1 (full)
            "irrigation_pump": 0.0,  # 0 (off) to 1 (on)
            "dosing_pump_a": 0.0,    # 0 to 1
            "dosing_pump_b": 0.0,    # 0 to 1
            "dosing_pump_ph_down": 0.0, # 0 to 1
        }
        
        # Anomaly log
        self.anomalies: List[Anomaly] = []
        self._max_anomalies = 100
        
        # Harvest tracking
        self.harvest_history: List[Dict[str, Any]] = []
        self.last_harvest_result: Optional[Dict[str, Any]] = None
        
        # Callbacks
        self._on_harvest_start: Optional[Callable] = None
        self._on_anomaly: Optional[Callable] = None
        
        # Metrics
        self.metrics = {
            "total_yield_kg": 0.0,
            "total_cycles": 0,
            "total_energy_kwh": 0.0,
            "uptime_hours": 0.0,
            "avg_efficiency_pct": 0.0,
        }

    def _load_default_config(self) -> Dict[str, Any]:
        """Load from farm_config.json or use defaults."""
        config_path = os.path.join(SCRIPT_DIR, "farm_config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            "climate_systems": {"target_temperature_day_c": 20, "target_humidity_rh": 80, "target_co2_ppm": 1000},
            "irrigation_system": {"target_ec_ms_cm": 1.4, "target_ph": 5.8},
            "crop": {"variety": "Tochiotome", "cycle_days": 120},
            "layout_specs": {"rack_count": 2, "tiers_per_rack": 5, "plants_per_tier": 14},
        }

    # ── Main Decision Loop ──

    def enable(self):
        """Enable autonomous mode."""
        self.enabled = True
        self.state = AutoState.MONITORING
        self.pid_temp.reset()
        self.pid_rh.reset()
        self.pid_co2.reset()
        print("🤖 Autonomous mode ENABLED")

    def disable(self):
        """Disable autonomous mode (manual takeover)."""
        self.enabled = False
        self.state = AutoState.DISABLED
        print("🔒 Autonomous mode DISABLED")

    def update(self, dt: float, sensor_data: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Main decision loop — call this every frame/tick.
        
        Args:
            dt: Time delta in seconds
            sensor_data: Latest sensor readings (optional, uses internal sim if None)
        
        Returns:
            Decision dict with actuator commands and status
        """
        if not self.enabled:
            return {"state": "disabled"}

        now = time.time()
        
        # Update sensor data
        if sensor_data:
            self.sensors.update(sensor_data)
        else:
            self._simulate_sensors(dt)

        # Rate limit decisions
        if now - self.last_decision_time < self.decision_interval:
            return self._get_status()
        self.last_decision_time = now

        # ── Decision Chain ──
        
        # 1. Safety checks
        safety_ok = self._check_safety()
        if not safety_ok:
            self.state = AutoState.ERROR
            return self._get_status()

        # 2. Climate PID
        self._update_climate(dt)

        # 3. Growth tracking
        self._update_growth(dt)

        # 4. State machine
        if self.state == AutoState.MONITORING:
            self._decide_monitoring()
        elif self.state == AutoState.GROWING:
            self._decide_growing()
        elif self.state == AutoState.PRE_HARVEST:
            self._decide_pre_harvest()
        elif self.state == AutoState.HARVESTING:
            self._decide_harvesting()
        elif self.state == AutoState.POST_HARVEST:
            self._decide_post_harvest()
        elif self.state == AutoState.ERROR:
            self._decide_error()

        # Update metrics
        self.metrics["uptime_hours"] += dt / 3600

        return self._get_status()

    # ── Climate & Irrigation Control ──

    def _update_climate(self, dt: float):
        """Run PID loops for temperature, humidity, CO2, and Irrigation."""
        temp = self.sensors["temperature_c"]
        rh = self.sensors["humidity_rh"]
        co2 = self.sensors["co2_ppm"]
        ec = self.sensors["ec_ms_cm"]
        ph = self.sensors["ph"]

        # PID outputs
        ac_cmd = self.pid_temp.update(temp, dt)
        rh_cmd = self.pid_rh.update(rh, dt)
        co2_cmd = self.pid_co2.update(co2, dt)
        ec_cmd = self.pid_ec.update(ec, dt)
        ph_cmd = self.pid_ph.update(ph, dt)

        # Map to HVAC actuators
        self.actuators["ac_power"] = ac_cmd
        self.actuators["humidifier"] = max(0, rh_cmd)
        self.actuators["co2_valve"] = max(0, co2_cmd)
        
        # Dehumidify by exhausting if RH is critically high
        if rh > self.pid_rh.setpoint + 5.0 and rh_cmd < 0:
            self.actuators["exhaust_fan"] = -rh_cmd
        else:
            self.actuators["exhaust_fan"] = 0.0

        # Map to Irrigation actuators
        self.actuators["dosing_pump_a"] = max(0, ec_cmd)
        self.actuators["dosing_pump_b"] = max(0, ec_cmd)
        self.actuators["dosing_pump_ph_down"] = abs(min(0, ph_cmd))
        
        # Main irrigation pump (basic timer logic: e.g. 15m on / 45m off)
        current_minute = (time.time() / 60) % 60
        irrigation_cfg = self.config.get("irrigation_system", {})
        on_min = irrigation_cfg.get("water_on_cycle_min", 15)
        if current_minute < on_min:
            self.actuators["irrigation_pump"] = 1.0
        else:
            self.actuators["irrigation_pump"] = 0.0

        # LED dimmer: adjust based on growth phase and setup
        if self.crop.phase == GrowthPhase.SEEDLING:
            self.actuators["led_dimmer"] = 0.6
        elif self.crop.phase in (GrowthPhase.FLOWERING, GrowthPhase.FRUITING):
            self.actuators["led_dimmer"] = 1.0
        else:
            self.actuators["led_dimmer"] = 0.8

        # Energy tracking (simplified)
        lighting_cfg = self.config.get("lighting_system", {})
        led_watts = lighting_cfg.get("total_wattage", 400) * self.actuators["led_dimmer"]
        ac_watts = abs(ac_cmd) * 3500  # 12000 BTU ~ 3500W equivalent
        pump_watts = self.actuators["irrigation_pump"] * irrigation_cfg.get("pump_wattage", 25)
        self.metrics["total_energy_kwh"] += (led_watts + ac_watts + pump_watts) * dt / 3_600_000

    # ── Growth Tracking ──

    _growth_accumulator: float = 0.0  # accumulated seconds toward next day

    def _update_growth(self, dt: float):
        """
        Accumulate time and advance the growth model once per simulated day.
        In real-time mode, 86400 seconds → 1 day.
        In accelerated mode (standalone test), caller advances days manually.
        """
        self._growth_accumulator += dt
        # Advance one day every 86400 real seconds
        if self._growth_accumulator >= 86400:
            self._growth_accumulator -= 86400
            self.crop.advance_day(
                temp_c=self.sensors["temperature_c"],
                rh_pct=self.sensors["humidity_rh"],
                ppfd=self.sensors.get("ppfd", 450),
            )

    # ── Safety ──

    def _check_safety(self) -> bool:
        """Check for dangerous conditions. Returns False if unsafe."""
        temp = self.sensors["temperature_c"]
        rh = self.sensors["humidity_rh"]
        co2 = self.sensors["co2_ppm"]

        safe = True

        if temp > 35:
            self._add_anomaly("critical", "climate",
                              f"Temperature critically high: {temp:.1f}°C", temp, 35)
            safe = False
        elif temp > 28:
            self._add_anomaly("warning", "climate",
                              f"Temperature high: {temp:.1f}°C", temp, 28)
        elif temp < 5:
            self._add_anomaly("critical", "climate",
                              f"Temperature critically low: {temp:.1f}°C", temp, 5)
            safe = False

        if rh > 95:
            self._add_anomaly("warning", "climate",
                              f"Humidity too high: {rh:.1f}% — mold risk", rh, 95)
        elif rh < 40:
            self._add_anomaly("warning", "climate",
                              f"Humidity too low: {rh:.1f}%", rh, 40)

        if co2 > 3000:
            self._add_anomaly("warning", "climate",
                              f"CO2 elevated: {co2:.0f}ppm", co2, 3000)

        return safe

    # ── State Machine Decisions ──

    def _decide_monitoring(self):
        """Initial state: assess crop and start growing."""
        # Always transition to growing when monitoring
        self.state = AutoState.GROWING
        print("  🌱 Starting growth cycle")

    def _decide_growing(self):
        """Monitor growth and detect harvest window."""
        if self.crop.should_harvest():
            self.state = AutoState.PRE_HARVEST
            print(f"  🍓 Harvest window detected! "
                  f"DAS: {self.crop.days_after_sowing}, "
                  f"Ripe: {self.crop.ripe_fraction*100:.0f}%")

    def _decide_pre_harvest(self):
        """Prepare for harvest: adjust climate, warm up robot."""
        # Optimal harvest conditions: slightly cooler (18°C) for firmness
        self.pid_temp.setpoint = 18.0
        
        # Transition to harvesting
        self.state = AutoState.HARVESTING
        print("  🤖 Starting autonomous harvest")
        
        if self._on_harvest_start:
            self._on_harvest_start()

    def _decide_harvesting(self):
        """Monitor harvest progress."""
        # In real system, this checks IsaacConnector job status
        if self.last_harvest_result:
            picked = self.last_harvest_result.get("picked", 0)
            weight = self.last_harvest_result.get("weight_g", 0)
            print(f"  📦 Harvest result: {picked} berries, {weight:.0f}g")
            
            self.metrics["total_yield_kg"] += weight / 1000
            self.metrics["total_cycles"] += 1
            self.harvest_history.append(self.last_harvest_result)
            self.last_harvest_result = None
            
            self.state = AutoState.POST_HARVEST

    def _decide_post_harvest(self):
        """Post-harvest: restore climate, prepare for next cycle."""
        # Restore normal temperature
        climate = self.config.get("climate", {})
        self.pid_temp.setpoint = climate.get("temperature_c", 20.0)
        
        # Reset crop for next cycle
        self.crop.days_after_sowing = 0
        self.crop.phase = GrowthPhase.SEEDLING
        self.crop.ripe_fraction = 0.0
        self.crop.health_score = 1.0
        
        self.state = AutoState.GROWING
        print("  🔄 Starting new growth cycle")

    def _decide_error(self):
        """Handle error state — attempt recovery."""
        # Check if conditions are safe again
        if self._check_safety():
            self.state = AutoState.MONITORING
            print("  ✓ Recovered from error state")

    # ── Simulation ──

    def _simulate_sensors(self, dt: float):
        """Simulate sensor drift without real hardware."""
        import random
        
        # Temperature drifts toward setpoint with noise
        temp = self.sensors["temperature_c"]
        ac = self.actuators["ac_power"]
        temp += ac * -0.1 * dt  # AC effect
        temp += random.gauss(0, 0.05)  # noise
        self.sensors["temperature_c"] = temp

        # Humidity
        rh = self.sensors["humidity_rh"]
        hum = self.actuators["humidifier"]
        rh += hum * 0.5 * dt - 0.02 * dt  # humidifier vs natural loss
        rh += random.gauss(0, 0.2)
        self.sensors["humidity_rh"] = max(30, min(99, rh))

        # CO2
        co2 = self.sensors["co2_ppm"]
        valve = self.actuators["co2_valve"]
        exhaust = self.actuators["exhaust_fan"]
        co2 += valve * 50 * dt - 5 * dt - exhaust * 10 * dt
        co2 += random.gauss(0, 5)
        self.sensors["co2_ppm"] = max(400, min(5000, co2))

        # EC
        ec = self.sensors["ec_ms_cm"]
        dosing_a = self.actuators["dosing_pump_a"]
        ec += dosing_a * 0.1 * dt - 0.005 * dt # Dosing increases EC, plants consume it
        ec += random.gauss(0, 0.01)
        self.sensors["ec_ms_cm"] = max(0.5, min(3.0, ec))

        # pH
        ph = self.sensors["ph"]
        ph_down = self.actuators["dosing_pump_ph_down"]
        ph -= ph_down * 0.2 * dt - 0.01 * dt # pH down lowers pH, water naturally drifts up
        ph += random.gauss(0, 0.05)
        self.sensors["ph"] = max(4.0, min(8.0, ph))

        # VPD calculation (simplified)
        svp = 0.6108 * math.exp(17.27 * temp / (temp + 237.3))
        vpd = svp * (1 - rh / 100)
        self.sensors["vpd_kpa"] = round(vpd, 3)

    # ── Anomaly Management ──

    def _add_anomaly(self, severity: str, category: str, message: str,
                     value: float = 0, threshold: float = 0):
        anomaly = Anomaly(
            timestamp=time.time(),
            severity=severity,
            category=category,
            message=message,
            value=value,
            threshold=threshold,
        )
        self.anomalies.append(anomaly)
        if len(self.anomalies) > self._max_anomalies:
            self.anomalies = self.anomalies[-self._max_anomalies:]
        
        if self._on_anomaly:
            self._on_anomaly(anomaly)

    # ── Status ──

    def _get_status(self) -> Dict[str, Any]:
        return {
            "state": self.state.value,
            "enabled": self.enabled,
            "sensors": {k: round(v, 2) for k, v in self.sensors.items()},
            "actuators": {k: round(v, 3) for k, v in self.actuators.items()},
            "crop": {
                "variety": self.crop.variety,
                "days_after_sowing": self.crop.days_after_sowing,
                "phase": self.crop.phase.value,
                "health": round(self.crop.health_score, 2),
                "growth_rate": round(self.crop.growth_rate, 2),
                "ripe_fraction": round(self.crop.ripe_fraction, 2),
                "estimated_yield_g": round(self.crop.estimated_yield_g),
                "should_harvest": self.crop.should_harvest(),
            },
            "metrics": {k: round(v, 3) if isinstance(v, float) else v 
                        for k, v in self.metrics.items()},
            "anomaly_count": len(self.anomalies),
            "recent_anomalies": [a.to_dict() for a in self.anomalies[-5:]],
        }

    def get_full_report(self) -> Dict[str, Any]:
        """Generate a complete status report."""
        status = self._get_status()
        status["harvest_history"] = self.harvest_history
        status["all_anomalies"] = [a.to_dict() for a in self.anomalies]
        return status


# ══════════════════════════════════════════════
# STANDALONE TEST
# ══════════════════════════════════════════════

if __name__ == "__main__":
    print("🧠 Farmbase Autonomous Controller — Standalone Test")
    print("=" * 50)

    controller = AutonomousController()
    controller.enable()

    # Simulate 130 days of growth (accelerated)
    dt = 86400  # 1 day per step
    for day in range(130):
        # Daily growth
        controller.crop.advance_day(
            temp_c=controller.sensors["temperature_c"],
            rh_pct=controller.sensors["humidity_rh"],
            ppfd=450,
        )

        # Update controller
        status = controller.update(1.0)  # 1 second dt for PID

        if day % 10 == 0:
            print(f"  Day {day:3d} | Phase: {status['crop']['phase']:15s} "
                  f"| Health: {status['crop']['health']:.2f} "
                  f"| Ripe: {status['crop']['ripe_fraction']*100:5.1f}% "
                  f"| State: {status['state']}")

        if controller.state == AutoState.HARVESTING:
            # Simulate harvest result
            controller.last_harvest_result = {
                "picked": 120,
                "failed": 5,
                "weight_g": 3000,
                "efficiency_pct": 96.0,
            }
            controller.update(1.0)
            break

    print("\n" + "=" * 50)
    report = controller.get_full_report()
    print(f"  Total yield:  {report['metrics']['total_yield_kg']:.3f} kg")
    print(f"  Total cycles: {report['metrics']['total_cycles']}")
    print(f"  Anomalies:    {report['anomaly_count']}")
    print(f"  Final state:  {report['state']}")
    print("=" * 50)
