import os
import re

source_path = "C:/Users/nesnk/Desktop/Farmbase/farmbase/ai_engine/isaac_bridge/build_farm_v2.py"
dest_path = "C:/Users/nesnk/Desktop/Farmbase/farmbase/ai_engine/isaac_bridge/build_farm_v3_ai.py"

with open(source_path, "r", encoding="utf-8") as f:
    code = f.read()

split_marker = "# ═══════════════════════════════════════════════════════════\n    # 🌟 V2 PHASE 2: ROBOTICS AI KINEMATICS & PATROL"
parts = code.split(split_marker)

if len(parts) < 2:
    print("FATAL: Could not find V2 split marker!")
    exit(1)

new_code = parts[0] + """# ═══════════════════════════════════════════════════════════
    # 🌟 V3 PHASE 3: GOD-TIER ROBOTICS (RMPFLOW & AI VISION LOOP)
    # ═══════════════════════════════════════════════════════════
    print("🦾 [Phase 3] Booting up God-Tier Robotics Core (Lula kinematics)...")
    import omni.ui as ui
    from omni.isaac.franka import Franka
    from omni.isaac.franka.controllers import RMPFlowController
    import math
    
    # ═══════════════════════════════════════════════════════════
    # 🏗️ ASSEMBLE 3D KINEMATIC XYZ GANTRY
    # ═══════════════════════════════════════════════════════════
    print("🤖 Building physical Overhead XYZ Gantry system...")
    
    rail_z = 2.65
    VisualCuboid("/World/GantrySys/Static_RailL", name="st_rail_l", position=np.array([-0.4, 0, rail_z]), scale=np.array([0.04, 3.2, 0.04]), color=np.array([0.7, 0.7, 0.72]))
    VisualCuboid("/World/GantrySys/Static_RailR", name="st_rail_r", position=np.array([ 0.4, 0, rail_z]), scale=np.array([0.04, 3.2, 0.04]), color=np.array([0.7, 0.7, 0.72]))

    bridge_xform = UsdGeom.Xform.Define(stage, "/World/GantrySys/BridgeY")
    VisualCuboid("/World/GantrySys/BridgeY/Mesh", name="bridge_mesh", position=np.array([0, 0, rail_z - 0.05]), scale=np.array([0.88, 0.06, 0.06]), color=np.array([0.85, 0.4, 0.1])) 
    bridge_api = UsdGeom.XformCommonAPI(bridge_xform.GetPrim())

    carriage_xform = UsdGeom.Xform.Define(stage, "/World/GantrySys/BridgeY/CarriageX")
    VisualCuboid("/World/GantrySys/BridgeY/CarriageX/Mesh", name="carr_mesh", position=np.array([0, 0, rail_z - 0.09]), scale=np.array([0.15, 0.12, 0.1]), color=np.array([0.2, 0.2, 0.22]))
    carr_api = UsdGeom.XformCommonAPI(carriage_xform.GetPrim())

    dropper_xform = UsdGeom.Xform.Define(stage, "/World/GantrySys/BridgeY/CarriageX/ArmZ")
    
    # Setup Target Visualization (Debug marker for AI Targeting)
    target_prim = world.scene.add(
        VisualCuboid(
            prim_path="/World/HarvestTarget",
            name="harvest_target",
            position=np.array([-0.2, 0.4, 1.2]),
            scale=np.array([0.03, 0.03, 0.03]),
            color=np.array([1.0, 0, 0])
        )
    )
    
    # Phase 3 Franka Instantiation
    franka_prim_path = "/World/GantrySys/BridgeY/CarriageX/ArmZ/Franka"
    my_franka = world.scene.add(
        Franka(
            prim_path=franka_prim_path,
            name="harvester_franka",
            position=np.array([0, 0, 0]), 
            orientation=np.array([0, 0.7071068, 0.7071068, 0]) # Invert on Y-axis to hang upside down
        )
    )
    
    arm_api = UsdGeom.XformCommonAPI(dropper_xform.GetPrim())
    arm_api.SetTranslate(Gf.Vec3d(0, 0, 2.0 - rail_z + 0.15))

    world.reset()
    
    print("🧠 Initializing RMPFlow Controller...")
    rmpflow_controller = RMPFlowController(name="franka_rmpflow", robot_articulation=my_franka)

    # Initialize variables
    start_time = time.time()
    last_ui_update = time.time()
    
    # FSM Constants
    STATE_PATROL = 0
    STATE_APPROACH = 1
    STATE_HARVEST = 2
    STATE_RETRACT = 3
    current_state = STATE_PATROL
    state_start_time = time.time()
    
    patrol_status = "SCANNING RACKS..."
    target_pos_str = "N/A"

    # UI Windows
    hud_window = ui.Window("🦾 Farmbase Phase 3: RMPFlow AI Robotics", width=420, height=280, dockPreference=ui.DockPreference.RIGHT_TOP)
    
    with hud_window.frame:
        with ui.VStack(spacing=5, padding=10):
            ui.Label("🤖 Robot Action Logger (StateMachine)", style={"font_size": 18, "color": 0xFF00AAFF, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("Action State:", width=120, style={"font_size": 16})
                lbl_status = ui.Label(patrol_status, style={"font_size": 16, "color": 0xFFFFFF00})
                
            with ui.HStack():
                ui.Label("Target Coord:", width=120, style={"font_size": 16})
                lbl_target = ui.Label(target_pos_str, style={"font_size": 16, "color": 0xFFFFFFFF})
                
            ui.Spacer(height=10)
            ui.Label("🎯 End-Effector Telemetry", style={"font_size": 18, "color": 0xFF00FF00, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("EE X (Reach):", width=120, style={"font_size": 16})
                lbl_x = ui.Label("0.00 m", style={"font_size": 16, "color": 0xFFFFFFFF})
                
            with ui.HStack():
                ui.Label("EE Y (Aisle):", width=120, style={"font_size": 16})
                lbl_y = ui.Label("0.00 m", style={"font_size": 16, "color": 0xFFFFFFFF})
                
            with ui.HStack():
                ui.Label("EE Z (Height):", width=120, style={"font_size": 16})
                lbl_z = ui.Label("0.00 m", style={"font_size": 16, "color": 0xFFFFFFFF})
    
    print("\\n✅ FARMBASE V3 — GOD-TIER ROBOTICS LIVE. Close the window to exit.")
    
    # Our Simulated Strawberry coordinates
    harvest_target = np.array([-0.3, 0.4, 1.2]) 
    
    while simulation_app.is_running():
        now = time.time()
        
        # --- State Machine ---
        if current_state == STATE_PATROL:
            patrol_status = "STATE 1: PATROL & SCAN"
            lbl_status.style = {"color": 0xFF00FF00, "font_size": 16}
            target_pos_str = "Searching..."
            
            elapsed = now - start_time
            gantry_y = math.sin(elapsed * 0.5) * 0.8
            # Move the bridge along Y aisle
            bridge_api.SetTranslate(Gf.Vec3d(0, gantry_y, 0))
            
            if abs(gantry_y - 0.4) < 0.02:
                print("🍓 TARGET ACQUIRED! SWITCHING TO APPROACH STATE...")
                current_state = STATE_APPROACH
                state_start_time = now
                # Stop Gantry
                bridge_api.SetTranslate(Gf.Vec3d(0, 0.4, 0)) 
                
        elif current_state == STATE_APPROACH:
            patrol_status = "STATE 2: RMPFLOW APPROACH"
            lbl_status.style = {"color": 0xFF00FFFF, "font_size": 16}
            target_pos_str = f"X:{-0.30:.2f} Y:{0.40:.2f} Z:{1.20:.2f}"
            
            # Offset by 15cm from target (simulating reach-in before cut)
            offset_target = harvest_target + np.array([0.15, 0, 0])
            actions = rmpflow_controller.forward(
                target_end_effector_position=offset_target,
            )
            my_franka.apply_action(actions)
            
            if now - state_start_time > 4.0:
                current_state = STATE_HARVEST
                state_start_time = now
                
        elif current_state == STATE_HARVEST:
            patrol_status = "STATE 3: CUTTING STEM"
            lbl_status.style = {"color": 0xFFFF0000, "font_size": 16, "weight": "bold"}
            
            actions = rmpflow_controller.forward(
                target_end_effector_position=harvest_target,
            )
            my_franka.apply_action(actions)
            
            # Simulated Cut (Close gripper after 1s)
            if now - state_start_time > 1.5:
                 my_franka.gripper.apply_action(my_franka.gripper.forward(action="close"))
            
            if now - state_start_time > 3.0:
                current_state = STATE_RETRACT
                state_start_time = now
                
        elif current_state == STATE_RETRACT:
            patrol_status = "STATE 4: RETRACTION"
            lbl_status.style = {"color": 0xFFFFAA00, "font_size": 16}
            
            # Move hand to rest
            home_pos = np.array([0, 0.4, 1.6])
            actions = rmpflow_controller.forward(
                target_end_effector_position=home_pos,
            )
            my_franka.apply_action(actions)
            
            if now - state_start_time > 4.0:
                # Open gripper and reset
                my_franka.gripper.apply_action(my_franka.gripper.forward(action="open"))
                current_state = STATE_PATROL
                start_time = now # reset time so wave starts over
                # Hack to stop immediate trigger
                start_time += 1.0 

        # --- UI Update ---
        if now - last_ui_update > 0.1:
            try:
                # EE Pos tracking
                ee_pos, _ = my_franka.end_effector.get_world_poses()
                if ee_pos is not None:
                    lbl_x.text = f"{ee_pos[0][0]:.3f} m"
                    lbl_y.text = f"{ee_pos[0][1]:.3f} m"
                    lbl_z.text = f"{ee_pos[0][2]:.3f} m"
            except:
                pass
                
            lbl_status.text = patrol_status
            lbl_target.text = target_pos_str
            last_ui_update = now

        world.step(render=True)
        
    simulation_app.close()

if __name__ == "__main__":
    main()
"""

with open(dest_path, "w", encoding="utf-8") as f:
    f.write(new_code)
print(f"✅ Generated {dest_path}")
