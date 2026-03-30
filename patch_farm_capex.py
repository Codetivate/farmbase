import os

filename = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm.py"

with open(filename, "r", encoding="utf-8") as f:
    code = f.read()

# The injection payload for calculating BOM based on variables defined earlier in build_farm.py
capex_code = """
    # ═══════════════════════════════════════════════════════════
    # 14. V6.0 AUTO-CAPEX (BOM) & INVESTMENT CALCULATION
    # ═══════════════════════════════════════════════════════════
    print("💰 [LOD 400] Calculating CapEx Bill of Materials (BOM) from Digital Twin...")
    import csv, os

    floor_area = ROOM_W * ROOM_D
    wall_area = (ROOM_W * ROOM_H * 2) + (ROOM_D * ROOM_H * 2)
    total_iso_area = floor_area + wall_area + floor_area

    bom_data = [
        ["[Phase 1: Facility & Structure]"],
        ["Isowall PIR Panel 4-inch (sq.m.)", total_iso_area, 800.0],
        ["Epoxy Floor Coating (sq.m.)", floor_area, 400.0],
        ["Sliding Hermetic Cleanroom Door 850x2100", 1, 15000.0],
        ["Electrical Control Board & Wiring", 1, 12000.0],
        
        ["[Phase 1: HVAC & Climate Control]"],
        ["Split AC 12000 BTU", 1, 12000.0],
        ["1.5kW Glycol Crown-Cooling Chiller", 1, 18000.0],
        ["PE Perforated Duct 200mm (m)", ROOM_D * 0.85, 300.0],
        ["Cooling Tube 16mm (m)", 2 * TIERS * (RACK_L + 1.0), 40.0],
        ["CO2 Tank & Control Solenoid", 1, 4000.0],
        ["Industrial Humidifier & Dehumidifier", 2, 4500.0],
        ["Exhaust Fan System", 1, 1500.0],
        
        ["[Phase 1: Cultivation & Lighting]"],
        [f"Galvanized Rack ({RACK_L}m x {RACK_D}m)", 2, 2500.0],
        [f"PVC NFT Gutter {RACK_L}m (pcs)", 2 * TIERS * 2, 150.0 * RACK_L],
        ["Samsung LM301H LED Board Full Spec", 2 * TIERS, 1500.0],
        ["Reservoir Tank 100L", 1, 1500.0],
        ["Dosing Pump (A/B/pH) & Sensors", 1, 8500.0],
        ["RO Filter Unit 400GPD", 1, 6000.0],
        ["Strawberry Crowns (Tochiotome)", plant_total, 25.0],
        
        ["[Phase 2: Automation & AI]"],
        ["Overhead XYZ Gantry Profile 2040 & Motors", 1, 15000.0],
        ["Intel RealSense D435i / Soft-Gripper", 1, 16000.0],
        ["NVIDIA Jetson Orin Nano", 1, 18000.0],
        ["BIM IOT Sensor Node", iot_total, 500.0]
    ]

    total_investment = 0
    out_dir = "C:/Users/nesnk/Desktop/Farmbase/farmbase/_output"
    os.makedirs(out_dir, exist_ok=True)
    csv_file = os.path.join(out_dir, "capex_investment.csv")
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Category/Item", "Quantity", "Unit Price (THB)", "Total Price (THB)"])
        for row in bom_data:
            if len(row) == 1:
                writer.writerow([row[0], "", "", ""]) # Heading
            else:
                line_total = row[1] * row[2]
                total_investment += line_total
                
                qty_str = f"{row[1]:.2f}" if isinstance(row[1], float) else str(row[1])
                writer.writerow(["  " + row[0], qty_str, f"{row[2]:,.2f}", f"{line_total:,.2f}"])
        
        writer.writerow(["-"*30, "-"*10, "-"*15, "-"*20])
        writer.writerow(["CAPEX GRAND TOTAL", "", "", f"{total_investment:,.2f}"])

    print("\\n" + "="*65)
    print(f"  💰 CAPEX AUTO-CALCULATED FROM DIGITAL TWIN")
    print(f"  TOTAL CAPITAL EXPENDITURE: {total_investment:,.2f} THB")
    print(f"  Saved detailed BOM to: _output/capex_investment.csv")
    print("="*65)
"""

# Find the loop near the end of the file
target_phrase = "while simulation_app.is_running():"
if target_phrase in code and "V6.0 AUTO-CAPEX" not in code:
    code = code.replace(target_phrase, capex_code + "\n    " + target_phrase)
    # Update title
    code = code.replace("FARMBASE V5.1 — REALISTIC USD STRAWBERRY GANTRY & AI REPLICATOR", "FARMBASE V6.0 — ENGINEERING CAPEX & AI REPLICATOR")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(code)
    print("V6.0 CapEx Patch Applied.")
else:
    print("Already applied or target phrase not found.")
