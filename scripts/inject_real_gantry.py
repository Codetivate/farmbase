import os

path = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm_v2.py"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# I will replace the block from "print('🦾 [Phase 2]" to "simulation_app.close()"
start_marker = '    print("🦾 [Phase 2] Booting up V2 Robotics Telemetry...")'
end_marker = '    simulation_app.close()'

if start_marker in code and end_marker in code:
    pre = code.split(start_marker)[0]
    post = code.split(end_marker)[1]
else:
    print("Could not find markers.")
    import sys
    sys.exit(1)

new_gantry_code = """    print("🦾 [Phase 2] Booting up V2 Robotics Telemetry...")
    import omni.ui as ui
    from pxr import UsdGeom, Gf

    # ═══════════════════════════════════════════════════════════
    # 🏗️ ASSEMBLE 3D KINEMATIC XYZ GANTRY
    # ═══════════════════════════════════════════════════════════
    print("🤖 Building physical Overhead XYZ Gantry system...")
    
    # 1. Static Y-Rails (Run along the aisle ceiling)
    # Aisle is at X=0, Y runs from -1.5 to +1.5
    rail_z = 2.65
    VisualCuboid("/World/GantrySys/Static_RailL", name="st_rail_l", position=np.array([-0.4, 0, rail_z]), scale=np.array([0.04, 3.2, 0.04]), color=np.array([0.7, 0.7, 0.72]))
    VisualCuboid("/World/GantrySys/Static_RailR", name="st_rail_r", position=np.array([ 0.4, 0, rail_z]), scale=np.array([0.04, 3.2, 0.04]), color=np.array([0.7, 0.7, 0.72]))

    # 2. X-Bridge (Moves along Y-axis / Aisle)
    bridge_xform = UsdGeom.Xform.Define(stage, "/World/GantrySys/BridgeY")
    VisualCuboid("/World/GantrySys/BridgeY/Mesh", name="bridge_mesh", position=np.array([0, 0, rail_z - 0.05]), scale=np.array([0.88, 0.06, 0.06]), color=np.array([0.85, 0.4, 0.1])) 
    bridge_api = UsdGeom.XformCommonAPI(bridge_xform.GetPrim())

    # 3. Carriage (Moves along X-axis / left-right sweeping)
    carriage_xform = UsdGeom.Xform.Define(stage, "/World/GantrySys/BridgeY/CarriageX")
    VisualCuboid("/World/GantrySys/BridgeY/CarriageX/Mesh", name="carr_mesh", position=np.array([0, 0, rail_z - 0.09]), scale=np.array([0.15, 0.12, 0.1]]), color=np.array([0.2, 0.2, 0.22]))
    carr_api = UsdGeom.XformCommonAPI(carriage_xform.GetPrim())

    # 4. Z-Dropper & End Effector
    dropper_xform = UsdGeom.Xform.Define(stage, "/World/GantrySys/BridgeY/CarriageX/ArmZ")
    
    # The pole stretches downwards. To make it telescopic, we can just move it, but a rigid pole is easier.
    # We will position the pole relative to the ArmZ xform.
    VisualCuboid("/World/GantrySys/BridgeY/CarriageX/ArmZ/Pole", name="pole_mesh", position=np.array([0, 0, 0.6]), scale=np.array([0.04, 0.04, 1.4]), color=np.array([0.8, 0.8, 0.85]))
    
    # 🍓 End Effector (Camera & Scissors block)
    VisualCuboid("/World/GantrySys/BridgeY/CarriageX/ArmZ/Effector", name="eff_mesh", position=np.array([0, 0, -0.15]), scale=np.array([0.16, 0.12, 0.14]), color=np.array([0.1, 0.6, 0.8]))
    # Stereo camera lenses
    VisualSphere("/World/GantrySys/BridgeY/CarriageX/ArmZ/Effector/LensL", name="lens_l", position=np.array([-0.04, 0.065, -0.15]), radius=0.015, color=np.array([0.05, 0.05, 0.05]))
    VisualSphere("/World/GantrySys/BridgeY/CarriageX/ArmZ/Effector/LensR", name="lens_r", position=np.array([ 0.04, 0.065, -0.15]), radius=0.015, color=np.array([0.05, 0.05, 0.05]))
    
    arm_api = UsdGeom.XformCommonAPI(dropper_xform.GetPrim())

    # Initialize variables
    start_time = time.time()
    last_ui_update = time.time()
    patrol_status = "SCANNING..."
    target_pos = "N/A"

    # Create V2 HUD
    hud_window = ui.Window("🦾 Farmbase Phase 2: AI Harvesting Robotics", width=420, height=260, dockPreference=ui.DockPreference.RIGHT_TOP)
    
    with hud_window.frame:
        with ui.VStack(spacing=5, padding=10):
            ui.Label("🤖 XYZ Gantry (Engineering Kinematics)", style={"font_size": 20, "color": 0xFF00AAFF, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("Y-Axis (Aisle Bridge):", width=160, style={"font_size": 18})
                lbl_y = ui.Label("0.00 m", style={"font_size": 18, "color": 0xFFFFFFFF})
                
            with ui.HStack():
                ui.Label("X-Axis (Rack Reach):", width=160, style={"font_size": 18})
                lbl_x = ui.Label("0.00 m", style={"font_size": 18, "color": 0xFFFFFFFF})
                
            with ui.HStack():
                ui.Label("Z-Axis (Vertical Drop):", width=160, style={"font_size": 18})
                lbl_z = ui.Label("0.00 m", style={"font_size": 18, "color": 0xFFFFFFFF})
                
            ui.Spacer(height=15)
            ui.Label("👁️ Replicator AI Vision (Stereo Camera)", style={"font_size": 20, "color": 0xFF00FF00, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("NVIDIA Controller:", width=160, style={"font_size": 18})
                lbl_status = ui.Label(patrol_status, style={"font_size": 18})
                
            with ui.HStack():
                ui.Label("Target Lock:", width=160, style={"font_size": 18})
                lbl_target = ui.Label(target_pos, style={"font_size": 18})
    
    print("\\n✅ FARMBASE V2 — ROBOTICS TELEMETRY IS LIVE. Close the window to exit.")
    
    patrol_speed = 0.5
    
    while simulation_app.is_running():
        now = time.time()
        elapsed = now - start_time
        
        # --- 1. Kinematic Patrol Math (Sine Waves) ---
        # Aisle Sweep (Y-axis): -1.3 to +1.3m
        pos_y = math.sin(elapsed * patrol_speed * 0.4) * 1.3 
        
        # Rack Reach (X-axis): swings into left rack (-0.4) or right rack (+0.4)
        pos_x = math.sin(elapsed * patrol_speed * 1.5) * 0.38
        
        # Tier Drops (Z-axis): from Z=2.2 (high) down to Z=0.6 (low)
        # We bounce the Z axis rapidly to inspect multiple tiers
        base_z = 1.3
        z_wave = math.sin(elapsed * patrol_speed * 0.8) * 0.8
        pos_z = base_z + z_wave
        
        # --- 2. Update USD Physics Positions ---
        # 1. Bridge moves along Y
        bridge_api.SetTranslate(Gf.Vec3d(0, pos_y, 0))
        # 2. Carriage moves along X (relative to bridge)
        carr_api.SetTranslate(Gf.Vec3d(pos_x, 0, 0))
        # 3. Arm drops along Z (relative to carriage, offset from carriage height)
        # ArmZ root is at carriage height, so translate downwards.
        drop_dist = pos_z - rail_z + 0.15 # pos_z is target world Z. Drop is negative.
        arm_api.SetTranslate(Gf.Vec3d(0, 0, drop_dist))

        # --- 3. Simulated AI Vision Triggers ---
        # If arm reaches deep into the racks (abs(X) > 0.3) AND Z is near a tier height
        if abs(pos_x) > 0.30:
            patrol_status = "🍓 TARGET ACQUIRED (Ripe)"
            target_pos = f"Y:{pos_y:.2f} | Z:{pos_z:.2f}"
            lbl_status.style = {"color": 0xFFFF0000, "font_size": 18, "weight": "bold"}
        else:
            patrol_status = "SCANNING..."
            target_pos = "Searching racks..."
            lbl_status.style = {"color": 0xFF00FF00, "font_size": 18}

        # --- 4. UI Update ---
        if now - last_ui_update > 0.1:
            lbl_y.text = f"{pos_y:.2f} m"
            lbl_x.text = f"{pos_x:.2f} m"
            lbl_z.text = f"{pos_z:.2f} m"
            lbl_status.text = patrol_status
            lbl_target.text = target_pos
            last_ui_update = now

        world.step(render=True)
        
    simulation_app.close()
"""

new_script = pre + new_gantry_code + post

with open(path, "w", encoding="utf-8") as f:
    f.write(new_script)

print("Injected actual 3D Gantry physics structure!")
