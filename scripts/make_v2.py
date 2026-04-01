import os
import shutil

src = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm.py"
dst = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm_v2.py"

with open(src, "r", encoding="utf-8") as f:
    code = f.read()

# Find the split point to swap out the V1/V7 logic with V2 Robotics Logic
delimiter = 'print("🌡️ [Virtual PLC] Booting up V7.0 Thermodynamics Engine...")'

if delimiter in code:
    first_part = code.split(delimiter)[0]
else:
    # Auto-fallback if the exact delimiter is missing
    first_part = code.split("while simulation_app.is_running():")[0]

v2_robotics_code = """
    # ═══════════════════════════════════════════════════════════
    # 🌟 V2 PHASE 2: ROBOTICS AI KINEMATICS & PATROL
    # ═══════════════════════════════════════════════════════════
    print("🦾 [Phase 2] Booting up V2 Robotics Telemetry...")
    import omni.ui as ui
    import time
    import math
    from pxr import UsdGeom, Gf

    # Attempt to grab the physical Gantry object if it exists
    gantry_prim = stage.GetPrimAtPath("/World/Gantry")
    if not gantry_prim.IsValid():
        # Fallback: Create a visual proxy object representing the Robot End Effector
        gantry_xform = UsdGeom.Xform.Define(stage, "/World/Gantry_Robot")
        gantry_cube = UsdGeom.Cube.Define(stage, "/World/Gantry_Robot/Head")
        gantry_cube.CreateSizeAttr(0.2)
        gantry_cube.CreateDisplayColorAttr([(0.0, 0.8, 1.0)]) # Cyan robot head proxy
        gantry_prim = gantry_xform.GetPrim()
    
    # Enable explicit transforms
    xform_api = UsdGeom.XformCommonAPI(gantry_prim)
    
    # Initialize variables
    start_time = time.time()
    last_ui_update = time.time()
    
    patrol_status = "SCANNING..."
    target_pos = "N/A"

    # Create V2 HUD
    hud_window = ui.Window("🦾 Farmbase V2: Robotics AI Telemetry", width=420, height=250, dockPreference=ui.DockPreference.RIGHT_TOP)
    
    with hud_window.frame:
        with ui.VStack(spacing=5, padding=10):
            ui.Label("🤖 XYZ Gantry (Kinematic Patrol Loop)", style={"font_size": 22, "color": 0xFF00AAFF, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("X-Axis (Aisle):", width=150, style={"font_size": 20})
                lbl_x = ui.Label("0.00 m", style={"font_size": 20, "color": 0xFFFFFFFF})
                
            with ui.HStack():
                ui.Label("Y-Axis (Reach):", width=150, style={"font_size": 20})
                lbl_y = ui.Label("0.00 m", style={"font_size": 20, "color": 0xFFFFFFFF})
                
            with ui.HStack():
                ui.Label("Z-Axis (Tier):", width=150, style={"font_size": 20})
                lbl_z = ui.Label("0.00 m", style={"font_size": 20, "color": 0xFFFFFFFF})
                
            ui.Spacer(height=15)
            ui.Label("👁️ AI Vision System (YOLO / SpatialVerse)", style={"font_size": 22, "color": 0xFF00FF00, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("AI Status:", width=150, style={"font_size": 20})
                lbl_status = ui.Label(patrol_status, style={"font_size": 20})
                
            with ui.HStack():
                ui.Label("Target Lock:", width=150, style={"font_size": 20})
                lbl_target = ui.Label(target_pos, style={"font_size": 20})
    
    print("\\n✅ FARMBASE V2 — ROBOTICS TELEMETRY IS LIVE. Close the window to exit.")
    
    patrol_speed = 0.5
    
    while simulation_app.is_running():
        now = time.time()
        elapsed = now - start_time
        
        # --- 1. Kinematic Patrol Math (Sine Waves) ---
        # Move along the center aisle (X: -1.5 to +1.5)
        pos_x = math.sin(elapsed * patrol_speed) * 1.5 
        # Sweeping arms left to right (Y: -0.8 to +0.8)
        pos_y = math.sin(elapsed * patrol_speed * 3.0) * 0.8
        # Moving up and down the tiers (Z: 0.5 to 2.2)
        pos_z = 1.35 + math.sin(elapsed * patrol_speed * 0.5) * 0.85
        
        # Update USD Physics position
        xform_api.SetTranslate(Gf.Vec3d(pos_x, pos_y, pos_z))
        
        # --- 2. Simulated AI Vision Triggers ---
        # If the robot arm reaches deeply into the racks (high Y absolute value)
        if abs(pos_y) > 0.65:
            patrol_status = "🍓 TARGET ACQUIRED (Ripe)"
            target_pos = f"X:{pos_x:.2f} | Z:{pos_z:.2f}"
        else:
            patrol_status = "SCANNING..."
            target_pos = "Searching..."

        # --- 3. UI Update ---
        if now - last_ui_update > 0.1:
            lbl_x.text = f"{pos_x:.2f} m"
            lbl_y.text = f"{pos_y:.2f} m"
            lbl_z.text = f"{pos_z:.2f} m"
            
            lbl_status.text = patrol_status
            lbl_status.style = {"color": 0xFFFF0000 if "TARGET" in patrol_status else 0xFF00FF00, "font_size": 20}
            
            lbl_target.text = target_pos
            lbl_target.style = {"color": 0xFFFFFFFF, "font_size": 20}
            
            last_ui_update = now

        world.step(render=True)
        
    simulation_app.close()
"""

new_code = first_part + v2_robotics_code

with open(dst, "w", encoding="utf-8") as f:
    f.write(new_code)

print("V2 Script generated correctly at: " + dst)
