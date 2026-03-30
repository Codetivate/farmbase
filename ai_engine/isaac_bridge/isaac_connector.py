"""
Isaac Connector — NVIDIA Isaac Sim Process Manager
=====================================================
Manages communication between Farmbase AI Engine and Isaac Sim.

Responsibilities:
  - Detect Isaac Sim installation (python.bat location)
  - Run scene_builder_standalone.py via subprocess (async)
  - Track build status (queued / running / done / error)
  - Return results: USD path, BOM, render image path

Usage:
    connector = IsaacConnector()
    job_id = await connector.build_scene(config_dict)
    status = connector.get_status(job_id)
"""

import asyncio
import json
import os
import subprocess
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


@dataclass
class BuildJob:
    id: str
    status: JobStatus = JobStatus.QUEUED
    config_path: str = ""
    usd_path: str = ""
    render_path: str = ""
    bom: Dict[str, Any] = field(default_factory=dict)
    error: str = ""
    started_at: float = 0.0
    finished_at: float = 0.0
    log: str = ""


# ── Auto-detect Isaac Sim paths ──
_POSSIBLE_ISAAC_PATHS = [
    r"C:\Users\nesnk\Desktop\isaac-sim",
    r"C:\isaac-sim",
    os.path.expanduser(r"~\Desktop\isaac-sim"),
    os.path.expanduser(r"~\isaac-sim"),
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCENE_BUILDER = os.path.join(SCRIPT_DIR, "scene_builder_standalone.py")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "output")


def _find_isaac_sim() -> Optional[str]:
    """Auto-detect Isaac Sim installation directory."""
    # Check environment variable first
    env_path = os.environ.get("ISAAC_SIM_PATH")
    if env_path and os.path.isfile(os.path.join(env_path, "python.bat")):
        return env_path

    for p in _POSSIBLE_ISAAC_PATHS:
        python_bat = os.path.join(p, "python.bat")
        if os.path.isfile(python_bat):
            return p

    return None


class IsaacConnector:
    """
    Manages Isaac Sim standalone process execution.
    
    Example:
        connector = IsaacConnector()
        if not connector.available:
            raise RuntimeError("Isaac Sim not found")
        
        job_id = await connector.build_scene({"room": {"width": 4, ...}})
        while connector.get_status(job_id).status == "running":
            await asyncio.sleep(1)
        result = connector.get_status(job_id)
    """

    def __init__(self):
        self.isaac_path = _find_isaac_sim()
        self.python_bat = (
            os.path.join(self.isaac_path, "python.bat")
            if self.isaac_path
            else None
        )
        self.jobs: Dict[str, BuildJob] = {}

        os.makedirs(OUTPUT_DIR, exist_ok=True)

        if self.isaac_path:
            print(f"✅ Isaac Sim found: {self.isaac_path}")
        else:
            print("⚠️  Isaac Sim not found — standalone builds disabled")

    @property
    def available(self) -> bool:
        return self.python_bat is not None and os.path.isfile(self.python_bat)

    @property
    def version(self) -> str:
        """Read Isaac Sim VERSION file."""
        if not self.isaac_path:
            return "unknown"
        ver_file = os.path.join(self.isaac_path, "VERSION")
        if os.path.isfile(ver_file):
            with open(ver_file, "r") as f:
                return f.read().strip()
        return "unknown"

    def info(self) -> Dict[str, Any]:
        """Return Isaac Sim installation info."""
        return {
            "available": self.available,
            "path": self.isaac_path or "",
            "version": self.version,
            "python_bat": self.python_bat or "",
            "scene_builder": SCENE_BUILDER,
            "output_dir": OUTPUT_DIR,
            "active_jobs": len(
                [j for j in self.jobs.values() if j.status == JobStatus.RUNNING]
            ),
        }

    async def build_scene(self, config: Dict[str, Any]) -> str:
        """
        Start an async Isaac Sim scene build.
        
        Args:
            config: Farm configuration dict (same schema as farm_config.json)
        
        Returns:
            job_id: Unique job ID for tracking
        """
        if not self.available:
            raise RuntimeError(
                "Isaac Sim not found. Install at C:\\Users\\nesnk\\Desktop\\isaac-sim "
                "or set ISAAC_SIM_PATH environment variable."
            )

        job_id = str(uuid.uuid4())[:8]
        job = BuildJob(id=job_id)

        # Write config to a temp file
        config_path = os.path.join(OUTPUT_DIR, f"config_{job_id}.json")
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        job.config_path = config_path
        self.jobs[job_id] = job

        # Launch async subprocess
        asyncio.create_task(self._run_build(job))
        return job_id

    async def _run_build(self, job: BuildJob):
        """Execute scene_builder_standalone.py in Isaac Sim's Python."""
        job.status = JobStatus.RUNNING
        job.started_at = time.time()

        cmd = [
            self.python_bat,
            SCENE_BUILDER,
            "--config", job.config_path,
            "--output-dir", OUTPUT_DIR,
            "--job-id", job.id,
        ]

        print(f"🚀 Isaac build [{job.id}]: {' '.join(cmd)}")

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=SCRIPT_DIR,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=300  # 5 min timeout
            )

            job.log = stdout.decode("utf-8", errors="replace")
            err_log = stderr.decode("utf-8", errors="replace")

            if process.returncode == 0:
                job.status = JobStatus.DONE
                self._parse_output(job)
                print(f"✅ Isaac build [{job.id}] complete")
            else:
                job.status = JobStatus.ERROR
                job.error = f"Exit code {process.returncode}: {err_log[:500]}"
                print(f"❌ Isaac build [{job.id}] failed: {job.error}")

        except asyncio.TimeoutError:
            job.status = JobStatus.ERROR
            job.error = "Build timed out (>5 minutes)"
            print(f"⏰ Isaac build [{job.id}] timed out")
        except FileNotFoundError:
            job.status = JobStatus.ERROR
            job.error = f"python.bat not found: {self.python_bat}"
            print(f"❌ Isaac build [{job.id}]: python.bat missing")
        except Exception as e:
            job.status = JobStatus.ERROR
            job.error = str(e)
            print(f"❌ Isaac build [{job.id}] error: {e}")
        finally:
            job.finished_at = time.time()

    def _parse_output(self, job: BuildJob):
        """Parse build output to find USD path and metadata."""
        # Look for the USD file
        usd_candidates = [
            os.path.join(OUTPUT_DIR, f"farmbase_{job.id}.usd"),
            os.path.join(OUTPUT_DIR, "farmbase_micro_pfal.usd"),
        ]
        for p in usd_candidates:
            if os.path.isfile(p):
                job.usd_path = p
                break

        # Check any .usd file in output dir
        if not job.usd_path:
            for f in os.listdir(OUTPUT_DIR):
                if f.endswith(".usd"):
                    job.usd_path = os.path.join(OUTPUT_DIR, f)
                    break

        # Look for render image
        render_candidates = [
            os.path.join(OUTPUT_DIR, f"render_{job.id}.png"),
            os.path.join(OUTPUT_DIR, "render.png"),
        ]
        for p in render_candidates:
            if os.path.isfile(p):
                job.render_path = p
                break

        # Load the config as BOM reference
        if os.path.isfile(job.config_path):
            with open(job.config_path, "r", encoding="utf-8") as f:
                job.bom = json.load(f)

    def get_status(self, job_id: str) -> Optional[BuildJob]:
        """Get job status by ID."""
        return self.jobs.get(job_id)

    def get_all_jobs(self) -> Dict[str, Dict[str, Any]]:
        """Return all jobs as serializable dicts."""
        result = {}
        for jid, job in self.jobs.items():
            elapsed = (
                (job.finished_at - job.started_at)
                if job.finished_at
                else (time.time() - job.started_at if job.started_at else 0)
            )
            result[jid] = {
                "id": job.id,
                "status": job.status.value,
                "usd_path": job.usd_path,
                "render_path": job.render_path,
                "error": job.error,
                "elapsed_seconds": round(elapsed, 1),
                "bom": job.bom,
            }
        return result

    # ── Cortex Harvester Integration ──

    async def run_cortex_harvest(
        self,
        config_path: Optional[str] = None,
        usd_path: Optional[str] = None,
        max_cycles: int = 1,
    ) -> str:
        """
        Spawn Cortex Harvester as a standalone Isaac Sim process.
        
        Args:
            config_path: Path to farm_config.json
            usd_path: Path to pre-built USD scene
            max_cycles: Number of harvest cycles (0=infinite)
        
        Returns:
            Job ID for tracking
        """
        if not self.available:
            raise RuntimeError("Isaac Sim not available")

        job_id = f"cortex_{int(time.time())}"
        cortex_script = os.path.join(SCRIPT_DIR, "cortex_harvester.py")

        if not os.path.isfile(cortex_script):
            raise FileNotFoundError(f"Cortex script not found: {cortex_script}")

        if config_path is None:
            config_path = os.path.join(SCRIPT_DIR, "farm_config.json")

        cmd = [
            self.python_bat,
            cortex_script,
            "--config", config_path,
            "--headless",
            "--max-cycles", str(max_cycles),
        ]
        if usd_path:
            cmd.extend(["--usd", usd_path])

        # Create a build job for tracking
        job = BuildJob(id=job_id, config_path=config_path)
        job.status = BuildStatus.RUNNING
        job.started_at = time.time()
        self.jobs[job_id] = job

        # Spawn async
        async def _run():
            try:
                proc = await asyncio.subprocess.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=SCRIPT_DIR,
                )
                stdout, stderr = await proc.communicate()
                job.finished_at = time.time()

                if proc.returncode == 0:
                    job.status = BuildStatus.DONE
                    # Try to load harvest result
                    result_path = os.path.join(OUTPUT_DIR, "harvest_result.json")
                    if os.path.isfile(result_path):
                        with open(result_path, 'r') as f:
                            job.bom = json.load(f)
                    print(f"✅ Cortex harvest {job_id} completed")
                else:
                    job.status = BuildStatus.FAILED
                    job.error = stderr.decode("utf-8", errors="replace")[-500:]
                    print(f"❌ Cortex harvest {job_id} failed: {job.error[:100]}")
            except Exception as e:
                job.status = BuildStatus.FAILED
                job.error = str(e)
                job.finished_at = time.time()

        asyncio.create_task(_run())
        return job_id
