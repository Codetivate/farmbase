import os

filename = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm.py"

with open(filename, "r", encoding="utf-8") as f:
    code = f.read()

# The injection payload for V7.0 Climate Engine
climate_code = """
    # ═══════════════════════════════════════════════════════════
    # 15. V7.0 CLIMATE ENGINE & VIRTUAL PLC (THERMODYNAMICS)
    # ═══════════════════════════════════════════════════════════
    print("🌡️ [Virtual PLC] Booting up V7.0 Thermodynamics Engine...")
    import omni.ui as ui
    import time

    current_temp = 20.0
    current_hum = 55.0
    
    # Actuator states
    ac_status = "OFF"
    mist_status = "OFF"
    pump_status = "OFF"
    
    last_pump_time = time.time()
    last_ui_update = time.time()

    # Create HUD Dashboard Layer
    hud_window = ui.Window("🎛️ Farmbase V7.0: Virtual PLC Control Desk", width=420, height=250, dockPreference=ui.DockPreference.RIGHT_TOP)
    
    with hud_window.frame:
        with ui.VStack(spacing=5, padding=10):
            ui.Label("🌡️ Thermodynamics (Live Simulator)", style={"font_size": 22, "color": 0xFF00FF00, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("Temperature:", width=150, style={"font_size": 20})
                temp_lbl = ui.Label(f"{current_temp:.1f} °C", style={"font_size": 20, "color": 0xFFDDDDDD})
                
            with ui.HStack():
                ui.Label("Relative Hum:", width=150, style={"font_size": 20})
                hum_lbl = ui.Label(f"{current_hum:.1f} %", style={"font_size": 20, "color": 0xFFDDDDDD})
                
            ui.Spacer(height=15)
            ui.Label("🤖 Actuators (AaaS Logic)", style={"font_size": 22, "color": 0xFF00AAFF, "alignment": ui.Alignment.CENTER})
            
            with ui.HStack():
                ui.Label("[AC / Chiller]:", width=150, style={"font_size": 20})
                ac_lbl = ui.Label(ac_status, style={"font_size": 20})
                
            with ui.HStack():
                ui.Label("[Humidifier]:", width=150, style={"font_size": 20})
                mist_lbl = ui.Label(mist_status, style={"font_size": 20})
                
            with ui.HStack():
                ui.Label("[NFT Pump]:", width=150, style={"font_size": 20})
                pump_lbl = ui.Label(pump_status, style={"font_size": 20})
    
    print("\\n✅ FARMBASE V7.0 — DIGITAL TWIN IS LIVE. Close the window to exit.")
    
    while simulation_app.is_running():
        # --- 1. Physics & Thermodynamics (Fast-Forward Mode) ---
        # LEDs emit heat over time (+0.005 C per frame)
        current_temp += 0.005 
        # Plants transpire moisture (+0.01 % per frame)
        current_hum += 0.01

        # --- 2. Virtual PLC Control Rules ---
        # Rule 1: AC Cooling
        if current_temp >= 22.0:
            ac_status = "ON (Cooling)"
        elif current_temp <= 20.0:
            ac_status = "OFF"
            
        if ac_status == "ON (Cooling)":
            current_temp -= 0.015  # Net loss of heat when AC is running

        # Rule 2: Humidity
        if current_hum <= 60.0:
            mist_status = "ON (Spraying)"
        elif current_hum >= 75.0:
            mist_status = "OFF"
            
        if mist_status == "ON (Spraying)":
            current_hum += 0.05    # Net gain in humidity
            
        # Rule 3: NFT Pump (Simulate a 10s cycle for visual demo, originally 15 mins)
        now = time.time()
        if now - last_pump_time > 10.0:
            pump_status = "ON (Flowing)"
            if now - last_pump_time > 13.0: # Run for 3 seconds
                pump_status = "OFF"
                last_pump_time = now

        # --- 3. Update UI ---
        # Throttle UI updates to avoid freezing (e.g. 10 FPS)
        if now - last_ui_update > 0.1:
            temp_lbl.text = f"{current_temp:.2f} °C"
            # Red if hot, White if normal
            temp_lbl.style = {"color": 0xFF0000FF if current_temp > 21.5 else 0xFFFFFFFF, "font_size": 22}
            
            hum_lbl.text = f"{current_hum:.2f} %"
            
            ac_lbl.text = ac_status
            ac_lbl.style = {"color": 0xFFFF8800 if "ON" in ac_status else 0xFF888888, "font_size": 20} # Cyan
            
            mist_lbl.text = mist_status
            mist_lbl.style = {"color": 0xFFFF00FF if "ON" in mist_status else 0xFF888888, "font_size": 20} # Magenta/Purple
            
            pump_lbl.text = pump_status
            pump_lbl.style = {"color": 0xFF00FF00 if "ON" in pump_status else 0xFF888888, "font_size": 20} # Green
            
            last_ui_update = now

        # Advance Simulation
        world.step(render=True)
"""

old_loop = "while simulation_app.is_running():\n        world.step(render=True)"

if old_loop in code and "V7.0 CLIMATE ENGINE" not in code:
    code = code.replace(old_loop, climate_code)
    # Optional update string
    code = code.replace("FARMBASE V6.0 — ENGINEERING CAPEX & AI REPLICATOR", "FARMBASE V7.0 — FULL DIGITAL TWIN WITH THERMODYNAMICS")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(code)
    print("V7.0 Climate Engine Patch Applied Successfully!")
else:
    print("Patch already applied OR target loop string not found!")
