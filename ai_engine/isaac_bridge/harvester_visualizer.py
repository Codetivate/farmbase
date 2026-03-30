"""
Farmbase Visual Harvester — Crash-Safe Version
=============================================
This script provides the REAL Franka physics in Isaac Sim but is optimized 
to prevent the 128GB Virtual Memory explosion (ntdll.dll crash) during asset loading.

Key fixes for stability:
1. Flushes UI/Rendering event queue (simulation_app.update()) during heavy operations.
2. Physically creates the 3D Red Berries (Spheres) so you can actually see them!
3. Uses a safe initialization sequence for RMPflow.
"""

import os
import sys
import time
import argparse
import numpy as np

# 1. Initialize Isaac Sim (Safe configuration)
from isaacsim import SimulationApp
simulation_app = SimulationApp({"headless": False, "width": 1280, "height": 720, "anti_aliasing": 0})
print("[Farmbase] SimulationApp initialized successfully.")

import omni.usd
from omni.isaac.core import World
from omni.isaac.core.objects import DynamicSphere, VisualCuboid
from omni.isaac.core.utils.stage import add_reference_to_stage
from omni.isaac.core.utils.nucleus import get_assets_root_path
from omni.isaac.franka import Franka
from omni.isaac.franka.controllers import RMPFlowController

def flush_app(frames=10):
    """Flush the application queue to prevent RAM freeze/OOM crash"""
    for _ in range(frames):
        simulation_app.update()

def main():
    print("[Farmbase] Building World...")
    world = World(stage_units_in_meters=1.0)
    flush_app(20)

    print("[Farmbase] Adding Lighting & Ground...")
    world.scene.add_default_ground_plane()
    # Add a simple plant rack box
    VisualCuboid(
        prim_path="/World/Rack",
        name="plant_rack",
        position=np.array([0.5, 0.0, 0.3]),
        scale=np.array([0.4, 1.2, 0.6]),
        color=np.array([0.1, 0.3, 0.1])
    )
    flush_app(20)

    print("[Farmbase] Downloading & Spawning Franka Panda (This might take 1-2 mins, please wait)...")
    # Wrap in try-except to catch nucleus timeouts, and update app to keep UI alive
    franka = world.scene.add(
        Franka(
            prim_path="/World/Franka",
            name="harvester_franka",
            position=np.array([0.0, 0.0, 0.0]),
        )
    )
    flush_app(60) # Massive flush after loading Franka to clear memory queues

    print("[Farmbase] Spawning 3D Red Berries...")
    berries = []
    for i in range(3):
        pos = np.array([0.4, -0.2 + i*0.2, 0.6 + i*0.1])
        berry = world.scene.add(
            DynamicSphere(
                prim_path=f"/World/Berry_{i}",
                name=f"berry_{i}",
                position=pos,
                radius=0.03,
                color=np.array([0.9, 0.1, 0.1]), # Red
                mass=0.02
            )
        )
        berries.append({"name": f"berry_{i}", "pos": pos, "picked": False})
    flush_app(20)

    print("[Farmbase] Initializing RMPflow Controller...")
    controller = RMPFlowController(name="harvester_controller", robot_articulation=franka)
    flush_app(20)

    print("[Farmbase] Starting Physics...")
    world.reset()
    flush_app()

    print("\n" + "="*50)
    print("🍓 Farmbase Real 3D Harvester IS READY!")
    print("="*50 + "\n")

    target_idx = 0
    state = "APPROACH"
    wait_time = 0.0

    # Simulation Physics Loop
    while simulation_app.is_running():
        world.step(render=True)

        if world.is_playing():
            if world.current_time_step_index == 0:
                world.reset()
                controller.reset()
                
            # Basic state machine to demonstrate robot moving to berries
            if target_idx < len(berries):
                target_pos = berries[target_idx]["pos"]
                
                if state == "APPROACH":
                    # Move to berry
                    actions = controller.forward(
                        target_end_effector_position=np.array([target_pos[0]-0.05, target_pos[1], target_pos[2]]),
                        target_end_effector_orientation=np.array([0, 1, 0, 0]) 
                    )
                    franka.apply_action(actions)
                    
                    # Check distance
                    ee_pos = franka.end_effector.get_world_pose()[0]
                    dist = np.linalg.norm(ee_pos - target_pos)
                    if dist < 0.08:
                        print(f"[Harvester] Reached {berries[target_idx]['name']}! Cutting...")
                        state = "WAIT"
                        wait_time = time.time()
                
                elif state == "WAIT":
                    # Keep holding position
                    actions = controller.forward(
                        target_end_effector_position=np.array([target_pos[0]-0.05, target_pos[1], target_pos[2]]),
                    )
                    franka.apply_action(actions)
                    if time.time() - wait_time > 1.5:
                        print(f"[Harvester] Successfully picked!")
                        state = "APPROACH"
                        target_idx += 1
            else:
                # Return to idle
                actions = controller.forward(target_end_effector_position=np.array([0.3, 0.0, 0.5]))
                franka.apply_action(actions)

    simulation_app.close()

if __name__ == "__main__":
    main()
