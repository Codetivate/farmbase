import os
"""
Farmbase 3D Architectural Builder v5.0 — LOD 400 Research-Validated
===================================================================
12m² (4.0×3.0×2.8 m) sealed PFAL — Tochiotome Strawberry
Site: Bangpakong, Chachoengsao, Thailand

LOD 400: PIR panels, epoxy floor, trench drain, Oishii flat gutter,
PE perforated duct (Zhang & Kacira 2016), split AC, CO2 crop-local
(Hidaka 2022), NFT irrigation (Yamazaki formula), LM301H B+R+FR LEDs
(Ries 2024), crown-cooling chiller (Hidaka 2017), BIM IOT nodes.

Research Basis: 18 peer-reviewed papers (DOI-verified, Mar 2026)
  - Ries & Park 2024: Far-red LED spectrum
  - Hidaka et al. 2017: Crown-cooling flower induction
  - Zhang & Kacira 2016: CFD PE duct airflow uniformity
  - Liang et al. 2025: VPD + vibration pollination
  - Graamans et al. 2018: Tropical PFAL energy budget
  - Chaichana et al. 2020: LED heat load → HVAC sizing

Run:
  C:\\Users\\nesnk\\Desktop\\isaac-sim\\python.bat ai_engine\\isaac_bridge\\build_farm.py
"""

import os, sys, json, math, time
import numpy as np

# ═══════════════════════════════════════════════════════════════
# 1. ISAAC SIM INIT
# ═══════════════════════════════════════════════════════════════
from isaacsim import SimulationApp
simulation_app = SimulationApp({"headless": False, "width": 1600, "height": 900, "anti_aliasing": 0})
print("✅ SimulationApp initialized (LOD 400 Mode).")

from omni.isaac.core import World
from omni.isaac.core.objects import VisualCuboid, VisualSphere
from omni.isaac.core.prims import XFormPrim
from pxr import Gf, UsdLux, UsdGeom
import omni.usd
import omni.kit.commands
import omni.replicator.core as rep
from pxr import Semantics

# ── Official NVIDIA Robot Assets ──
try:
    from isaacsim.core.utils.stage import add_reference_to_stage
    HAS_ASSET_LOADER = True
except ImportError:
    try:
        from omni.isaac.core.utils.stage import add_reference_to_stage
        HAS_ASSET_LOADER = True
    except ImportError:
        HAS_ASSET_LOADER = False
        print("⚠️  add_reference_to_stage not available — robot assets will be skipped")


def flush(n=10):
    for _ in range(n):
        simulation_app.update()

def quat(roll=0, pitch=0, yaw=0):
    cy, sy = np.cos(yaw/2), np.sin(yaw/2)
    cp, sp = np.cos(pitch/2), np.sin(pitch/2)
    cr, sr = np.cos(roll/2), np.sin(roll/2)
    return np.array([
        cr*cp*cy + sr*sp*sy, sr*cp*cy - cr*sp*sy,
        cr*sp*cy + sr*cp*sy, cr*cp*sy - sr*sp*cy,
    ])


# ═══════════════════════════════════════════════════════════════
# 2. LOAD BLUEPRINT
# ═══════════════════════════════════════════════════════════════
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(os.path.dirname(SCRIPT_DIR), "farm_config.json")
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        CFG = json.load(f)
    print(f"📄 Blueprint: {CFG.get('farm_name','Farmbase')}")
else:
    raise FileNotFoundError(f"Missing {CONFIG_PATH}")

R = CFG["room_specs"]
L = CFG["layout_specs"]

ROOM_W = R["width_m"]     # 4.0
ROOM_D = R["depth_m"]     # 3.0
ROOM_H = R["height_m"]    # 2.8
AISLE  = L["center_aisle_width_m"]  # 0.8
RACK_L = L["rack_length_m"]   # 1.8
RACK_D = L["rack_depth_m"]    # 0.4
TIERS  = L["tiers_per_rack"]  # 5
T_GAP  = L["tier_height_gap_m"]   # 0.35
T_BASE = L["first_tier_height_m"] # 0.30
ANGLE  = L["gutter_angle_deg"]    # 30
PPT    = L["plants_per_tier"]     # 14

# ── LOD 400 color palette ──
WHITE_PANEL = np.array([0.96, 0.96, 0.94])
EPOXY_FLOOR = np.array([0.62, 0.64, 0.63])
SS_METAL    = np.array([0.72, 0.73, 0.75])
ANODIZED_AL = np.array([0.78, 0.80, 0.82])
CEIL_WHITE  = np.array([0.90, 0.90, 0.90])
DARK_RUBBER = np.array([0.12, 0.12, 0.14])
PE_DUCT_WHT = np.array([0.92, 0.92, 0.90])  # PE perforated duct (Zhang & Kacira 2016)
AC_WHITE    = np.array([0.95, 0.95, 0.95])
TANK_BLUE   = np.array([0.20, 0.35, 0.55])
CO2_GREEN   = np.array([0.15, 0.40, 0.15])
LED_BLACK   = np.array([0.08, 0.08, 0.08])
SENSOR_GRN  = np.array([0.10, 0.50, 0.20])
BERRY_RED   = np.array([0.85, 0.12, 0.10])
BERRY_WHITE = np.array([0.90, 0.88, 0.80])
LEAF_GREEN  = np.array([0.18, 0.55, 0.15])
BRACKET_GRY = np.array([0.45, 0.45, 0.48])
CHILLER_BLU = np.array([0.30, 0.45, 0.60])  # Crown-cooling chiller (Hidaka 2017)
COOL_TUBE   = np.array([0.55, 0.70, 0.85])  # Cooling tubes (PE 16mm)


# ═══════════════════════════════════════════════════════════════
# 3. BUILD — LOD 400
# ═══════════════════════════════════════════════════════════════
def main():
    world = World(stage_units_in_meters=1.0)
    stage = omni.usd.get_context().get_stage()

    # ── Lighting ──
    print("💡 Setting up RTX lighting...")
    world.scene.add_default_ground_plane()
    dome = UsdLux.DomeLight.Define(stage, "/World/Env/DomeLight")
    dome.CreateIntensityAttr(300.0)
    dome.CreateColorAttr(Gf.Vec3f(0.95, 0.95, 1.0))
    flush(6)

    T = 0.05  # 50mm PIR panel thickness

    # ═══════════════════════════════════════════════════════════
    # 4. ROOM SHELL — PIR Sandwich Panels
    # ═══════════════════════════════════════════════════════════
    print("🏗️  [LOD 400] PIR sandwich panel room shell...")

    # Floor — medical-grade epoxy
    VisualCuboid("/World/Room/Floor", name="epoxy_floor",
                 position=np.array([0, 0, -T/2]),
                 scale=np.array([ROOM_W, ROOM_D, T]),
                 color=EPOXY_FLOOR)

    # Perimeter coving (dark rubber quarter-round)
    cov_w = 0.04
    for i, (pos, sz) in enumerate([
        ([0, -ROOM_D/2+cov_w/2, cov_w/2], [ROOM_W, cov_w, cov_w]),
        ([0,  ROOM_D/2-cov_w/2, cov_w/2], [ROOM_W, cov_w, cov_w]),
        ([-ROOM_W/2+cov_w/2, 0, cov_w/2], [cov_w, ROOM_D, cov_w]),
        ([ ROOM_W/2-cov_w/2, 0, cov_w/2], [cov_w, ROOM_D, cov_w]),
    ]):
        VisualCuboid(f"/World/Room/Cov_{i}", name=f"cov_{i}",
                     position=np.array(pos), scale=np.array(sz), color=DARK_RUBBER)

    # Central trench drain (stainless steel)
    drain_d = ROOM_D * 0.6
    VisualCuboid("/World/Room/Drain", name="drain",
                 position=np.array([0, 0, -0.005]),
                 scale=np.array([0.10, drain_d, 0.015]), color=SS_METAL)
    for gi in range(8):
        gy = -drain_d/2 + drain_d*(gi+0.5)/8
        VisualCuboid(f"/World/Room/Grate_{gi}", name=f"grate_{gi}",
                     position=np.array([0, gy, 0.003]),
                     scale=np.array([0.08, 0.005, 0.005]), color=SS_METAL*0.85)

    # Walls
    VisualCuboid("/World/Room/BackWall", name="back_wall",
                 position=np.array([0, -ROOM_D/2-T/2, ROOM_H/2]),
                 scale=np.array([ROOM_W+2*T, T, ROOM_H]), color=WHITE_PANEL)
    VisualCuboid("/World/Room/LeftWall", name="left_wall",
                 position=np.array([-ROOM_W/2-T/2, 0, ROOM_H/2]),
                 scale=np.array([T, ROOM_D, ROOM_H]), color=WHITE_PANEL)
    VisualCuboid("/World/Room/RightWall", name="right_wall",
                 position=np.array([ROOM_W/2+T/2, 0, ROOM_H/2]),
                 scale=np.array([T, ROOM_D, ROOM_H]), color=WHITE_PANEL)

    # Front wall with doorway (850×2100mm)
    door_w, door_h = 0.85, 2.10
    front_y = ROOM_D/2 + T/2
    seg_w = (ROOM_W - door_w)/2 + T
    VisualCuboid("/World/Room/FrontL", name="front_l",
                 position=np.array([-ROOM_W/2-T+seg_w/2, front_y, ROOM_H/2]),
                 scale=np.array([seg_w, T, ROOM_H]), color=WHITE_PANEL)
    VisualCuboid("/World/Room/FrontR", name="front_r",
                 position=np.array([ROOM_W/2+T-seg_w/2, front_y, ROOM_H/2]),
                 scale=np.array([seg_w, T, ROOM_H]), color=WHITE_PANEL)
    VisualCuboid("/World/Room/Lintel", name="lintel",
                 position=np.array([0, front_y, (ROOM_H+door_h)/2]),
                 scale=np.array([door_w, T, ROOM_H-door_h]), color=WHITE_PANEL)

    # Door frame — aluminum trim
    fr = 0.025
    VisualCuboid("/World/Room/DoorFL", name="door_fl",
                 position=np.array([-door_w/2-fr/2, front_y, door_h/2]),
                 scale=np.array([fr, T+0.01, door_h]), color=ANODIZED_AL)
    VisualCuboid("/World/Room/DoorFR", name="door_fr",
                 position=np.array([door_w/2+fr/2, front_y, door_h/2]),
                 scale=np.array([fr, T+0.01, door_h]), color=ANODIZED_AL)
    VisualCuboid("/World/Room/DoorFT", name="door_ft",
                 position=np.array([0, front_y, door_h+fr/2]),
                 scale=np.array([door_w+2*fr, T+0.01, fr]), color=ANODIZED_AL)

    # Ceiling
    VisualCuboid("/World/Room/Ceiling", name="ceiling",
                 position=np.array([0, 0, ROOM_H+T/2]),
                 scale=np.array([ROOM_W+2*T, ROOM_D+2*T, T]), color=CEIL_WHITE)

    # Panel joint lines (horizontal seams every 0.6m)
    for side, wx in [("L", -ROOM_W/2-T), ("R", ROOM_W/2+T)]:
        for jz in np.arange(0.6, ROOM_H, 0.6):
            VisualCuboid(f"/World/Room/J_{side}_{int(jz*10)}", name=f"j_{side}_{int(jz*10)}",
                         position=np.array([wx, 0, jz]),
                         scale=np.array([0.003, ROOM_D, 0.005]), color=WHITE_PANEL*0.85)

    flush(10)
    print("   ✓ PIR shell complete (coving, drain, door frame, joints)")

    # ═══════════════════════════════════════════════════════════
    # 4b. SLIDING HERMETIC DOOR — ISO Cleanroom Grade
    #     Ref: ISO 14644-4 (Cleanroom design), Oishii PFAL standard
    #     - Top-hung rail (no floor track → sanitation)
    #     - SUS304 stainless + FRP composite panel
    #     - EPDM gasket 4-side seal (IP54+)
    #     - Magnetic latch + proximity sensor
    #     - Modular expansion flange (bolt-on for room extension)
    # ═══════════════════════════════════════════════════════════
    print("🚪 [LOD 400] Sliding Hermetic Door system...")
    SUS304 = np.array([0.75, 0.76, 0.78])   # Brushed stainless
    GASKET = np.array([0.08, 0.08, 0.10])   # EPDM rubber black
    RAIL_AL = np.array([0.82, 0.84, 0.86])  # Anodized rail

    # ── Top-hung aluminum rail ──
    # Rail extends beyond door opening for slide clearance
    rail_len = door_w * 2.2   # door slides fully open
    rail_y = front_y + 0.03   # just outside the frame
    rail_z = door_h + fr + 0.03

    VisualCuboid("/World/Door/Rail", name="door_rail",
                 position=np.array([door_w * 0.35, rail_y, rail_z]),
                 scale=np.array([rail_len, 0.06, 0.04]),
                 color=RAIL_AL)
    # Rail end stops (2 blocks)
    VisualCuboid("/World/Door/RailStopL", name="rail_stop_l",
                 position=np.array([door_w*0.35 - rail_len/2, rail_y, rail_z]),
                 scale=np.array([0.02, 0.06, 0.05]),
                 color=RAIL_AL * 0.8)
    VisualCuboid("/World/Door/RailStopR", name="rail_stop_r",
                 position=np.array([door_w*0.35 + rail_len/2, rail_y, rail_z]),
                 scale=np.array([0.02, 0.06, 0.05]),
                 color=RAIL_AL * 0.8)

    # ── Roller carriage (2 bogies) ──
    for bi, bx_off in enumerate([-0.20, 0.20]):
        VisualCuboid(f"/World/Door/Bogie_{bi}", name=f"bogie_{bi}",
                     position=np.array([bx_off, rail_y, rail_z - 0.015]),
                     scale=np.array([0.08, 0.04, 0.025]),
                     color=SUS304)

    # ── SUS304 Door Panel (850×2100×40mm) ──
    # Position: closed position (covering the doorway)
    panel_t = 0.04   # 40mm thick composite panel
    VisualCuboid("/World/Door/Panel", name="door_panel",
                 position=np.array([0, rail_y, door_h/2]),
                 scale=np.array([door_w - 0.01, panel_t, door_h - 0.01]),
                 color=SUS304)

    # Panel surface detail — brushed stainless texture lines
    for si in range(4):
        sz = door_h * 0.2 + si * door_h * 0.2
        VisualCuboid(f"/World/Door/PanelLine_{si}", name=f"panel_line_{si}",
                     position=np.array([0, rail_y + panel_t/2 + 0.001, sz]),
                     scale=np.array([door_w * 0.9, 0.001, 0.002]),
                     color=SUS304 * 0.92)

    # ── EPDM Gasket Seals (4 sides) ──
    gasket_t = 0.012  # gasket width
    # Left seal
    VisualCuboid("/World/Door/GasketL", name="gasket_l",
                 position=np.array([-door_w/2 + 0.005, front_y, door_h/2]),
                 scale=np.array([gasket_t, 0.02, door_h]),
                 color=GASKET)
    # Right seal
    VisualCuboid("/World/Door/GasketR", name="gasket_r",
                 position=np.array([door_w/2 - 0.005, front_y, door_h/2]),
                 scale=np.array([gasket_t, 0.02, door_h]),
                 color=GASKET)
    # Top seal
    VisualCuboid("/World/Door/GasketT", name="gasket_t",
                 position=np.array([0, front_y, door_h - 0.005]),
                 scale=np.array([door_w, 0.02, gasket_t]),
                 color=GASKET)
    # Bottom seal (sweep gasket — no floor rail, keeps it cleanroom-grade)
    VisualCuboid("/World/Door/GasketB", name="gasket_b",
                 position=np.array([0, front_y, 0.006]),
                 scale=np.array([door_w, 0.02, gasket_t]),
                 color=GASKET)

    # ── Floor threshold plate (SUS304, flush-mounted) ──
    # Recessed into epoxy floor — no trip hazard, forklift-safe
    VisualCuboid("/World/Door/Threshold", name="threshold",
                 position=np.array([0, front_y, -0.002]),
                 scale=np.array([door_w + 0.10, 0.08, 0.006]),
                 color=SUS304 * 0.95)

    # ── Handle — horizontal push bar (sanitary, no knobs) ──
    VisualCuboid("/World/Door/Handle", name="handle",
                 position=np.array([0, rail_y + panel_t/2 + 0.015, door_h * 0.48]),
                 scale=np.array([0.40, 0.025, 0.03]),
                 color=SUS304 * 0.85)
    # Handle brackets
    for hbi, hbx in enumerate([-0.18, 0.18]):
        VisualCuboid(f"/World/Door/HandleBkt_{hbi}", name=f"handle_bkt_{hbi}",
                     position=np.array([hbx, rail_y + panel_t/2 + 0.008, door_h * 0.48]),
                     scale=np.array([0.025, 0.015, 0.04]),
                     color=SUS304)

    # ── Magnetic latch (keeps door sealed when closed) ──
    VisualCuboid("/World/Door/MagLatch", name="mag_latch",
                 position=np.array([door_w/2 - 0.04, front_y, door_h * 0.50]),
                 scale=np.array([0.03, 0.03, 0.04]),
                 color=np.array([0.15, 0.15, 0.17]))

    # ── Proximity sensor (auto-detect open/close for HVAC interlock) ──
    VisualCuboid("/World/Door/ProxSensor", name="prox_sensor",
                 position=np.array([door_w/2 + fr, front_y, door_h - 0.10]),
                 scale=np.array([0.02, 0.02, 0.03]),
                 color=SENSOR_GRN)
    # Sensor LED indicator
    VisualSphere("/World/Door/ProxLED", name="prox_led",
                 position=np.array([door_w/2 + fr + 0.012, front_y, door_h - 0.08]),
                 radius=0.004, color=np.array([0.1, 0.9, 0.1]))

    # ── Modular Expansion Flange ──
    # Bolt-on coupling flange around door frame exterior
    # Purpose: future room-to-room connection or corridor attachment
    # Standard: ISO modular cleanroom compatible (bolt pattern M10 × 12)
    flange_w = door_w + 0.20
    flange_h = door_h + 0.15
    flange_depth = 0.015

    # Flange frame (L-bracket profile around door exterior)
    # Top flange
    VisualCuboid("/World/Door/FlangeTop", name="flange_top",
                 position=np.array([0, front_y + T/2 + flange_depth/2, door_h + 0.08]),
                 scale=np.array([flange_w, flange_depth, 0.06]),
                 color=ANODIZED_AL * 0.95)
    # Bottom flange
    VisualCuboid("/World/Door/FlangeBot", name="flange_bot",
                 position=np.array([0, front_y + T/2 + flange_depth/2, -0.01]),
                 scale=np.array([flange_w, flange_depth, 0.04]),
                 color=ANODIZED_AL * 0.95)
    # Left flange
    VisualCuboid("/World/Door/FlangeL", name="flange_l",
                 position=np.array([-flange_w/2, front_y + T/2 + flange_depth/2, door_h/2]),
                 scale=np.array([0.04, flange_depth, flange_h]),
                 color=ANODIZED_AL * 0.95)
    # Right flange
    VisualCuboid("/World/Door/FlangeR", name="flange_r",
                 position=np.array([flange_w/2, front_y + T/2 + flange_depth/2, door_h/2]),
                 scale=np.array([0.04, flange_depth, flange_h]),
                 color=ANODIZED_AL * 0.95)

    # Bolt holes (visual indicators — 8 bolts M10)
    bolt_positions = [
        (-flange_w/2+0.03, door_h*0.15), (-flange_w/2+0.03, door_h*0.50),
        (-flange_w/2+0.03, door_h*0.85), (flange_w/2-0.03, door_h*0.15),
        (flange_w/2-0.03, door_h*0.50),  (flange_w/2-0.03, door_h*0.85),
        (-0.15, door_h+0.08),            (0.15, door_h+0.08),
    ]
    for bi, (bx, bz) in enumerate(bolt_positions):
        VisualSphere(f"/World/Door/Bolt_{bi}", name=f"bolt_{bi}",
                     position=np.array([bx, front_y + T/2 + flange_depth + 0.002, bz]),
                     radius=0.008, color=SUS304 * 0.7)

    flush(6)
    print("   ✓ Hermetic sliding door (SUS304, EPDM seal, expansion flange)")

    # ═══════════════════════════════════════════════════════════
    # 5. OISHII-ACCURATE RACKING — Flat Gutter + Pendant Fruit
    #    Ref: Oishii "Amatelas" farm (NJ), patent US11304374
    #    - Gutter is nearly FLAT (5° slope for NFT flow only)
    #    - Crown planted at OUTER EDGE of gutter
    #    - Fruit hangs DOWN below gutter by gravity (pendant habit)
    #    - Drip irrigation line runs along each gutter
    #    - Robot harvests from aisle looking UP at hanging fruit
    # ═══════════════════════════════════════════════════════════
    print("🔩 [LOD 400] Oishii-accurate flat gutter racking...")
    POST_W = 0.04       # 40mm T-slot
    GUTTER_W = 0.25     # wider flat gutter (like real Oishii — ~250mm)
    GUTTER_D = 0.06     # depth of U-channel
    SLOPE_RAD = math.radians(5)  # 5° slope for NFT nutrient flow only
    DRIP_COLOR = np.array([0.15, 0.15, 0.16])   # black PE drip line
    EMITTER_CLR = np.array([0.40, 0.10, 0.10])  # red drip emitter

    # 4-Rack Double Aisle Layout (Aisles at X = -1.0 and X = 1.0)
    rack_data = [
        ("L_Wall", -1.7, 1),   # Left Wall
        ("L_Mid",  -0.3, -1),  # Center Left
        ("R_Mid",   0.3, 1),   # Center Right
        ("R_Wall",  1.7, -1)   # Right Wall
    ]

    for side, rx, face_dir in rack_data:

        # 4 vertical posts per rack
        for pi, (px_off, py_off) in enumerate([
            (-RACK_D/2, -RACK_L/2), (-RACK_D/2, RACK_L/2),
            (RACK_D/2, -RACK_L/2),  (RACK_D/2, RACK_L/2),
        ]):
            VisualCuboid(f"/World/Racks/{side}/Post_{pi}", name=f"post_{side}_{pi}",
                         position=np.array([rx+px_off, py_off, ROOM_H*0.45]),
                         scale=np.array([POST_W, POST_W, ROOM_H*0.9]), color=ANODIZED_AL)

        for t in range(TIERS):
            tz = T_BASE + t * T_GAP

            # ── Horizontal shelf bracket (flat, no 30° cant) ──
            shelf_cx = rx + face_dir * GUTTER_W * 0.3  # slight overhang
            VisualCuboid(f"/World/Racks/{side}/Shelf_T{t}", name=f"shelf_{side}_t{t}",
                         position=np.array([shelf_cx, 0, tz]),
                         scale=np.array([GUTTER_W + 0.10, RACK_L * 0.95, 0.02]),
                         color=BRACKET_GRY)

            # Cross braces at tier level
            for py_off in [-RACK_L/2, RACK_L/2]:
                VisualCuboid(f"/World/Racks/{side}/Br_T{t}_{int((py_off+1)*10)}",
                             name=f"br_{side}_t{t}_{int((py_off+1)*10)}",
                             position=np.array([rx, py_off, tz - 0.02]),
                             scale=np.array([RACK_D + 0.10, POST_W*0.6, POST_W*0.6]),
                             color=ANODIZED_AL*0.9)

            # ── NFT Gutter (Oishii-style 15° angled slope for outer canopy) ──
            gut_cx = rx + face_dir * GUTTER_W * 0.5
            gut_cz = tz + 0.02  # sits on shelf
            
            gut_block_path = f"/World/Racks/{side}/GutterBlock_T{t}"
            gut_xform = UsdGeom.Xform.Define(stage, gut_block_path)
            xform_api = UsdGeom.XformCommonAPI(gut_xform)
            xform_api.SetTranslate(Gf.Vec3d(gut_cx, 0, gut_cz))
            # Tilt 15 degrees facing aisle (+X downwards for L, -X downwards for R)
            xform_api.SetRotate(Gf.Vec3f(0, face_dir * 15, 0))
            
            # Gutter base
            VisualCuboid(f"{gut_block_path}/Gut", name=f"gut_{side}_t{t}",
                         position=np.array([0, 0, 0]),
                         scale=np.array([GUTTER_W, RACK_L, 0.008]),
                         color=WHITE_PANEL * 0.95)
            # Gutter back wall
            VisualCuboid(f"{gut_block_path}/GutBack", name=f"gutback_{side}_t{t}",
                         position=np.array([-face_dir*(GUTTER_W/2-0.003), 0, GUTTER_D/2]),
                         scale=np.array([0.006, RACK_L, GUTTER_D]),
                         color=WHITE_PANEL * 0.92)
            # Gutter front lip (shorter for fruit overhang)
            VisualCuboid(f"{gut_block_path}/GutFront", name=f"gutfront_{side}_t{t}",
                         position=np.array([face_dir*(GUTTER_W/2-0.003), 0, GUTTER_D*0.3]),
                         scale=np.array([0.006, RACK_L, GUTTER_D * 0.6]),
                         color=WHITE_PANEL * 0.92)
            # Truss Support Wire (guides crowns outward)
            VisualCuboid(f"{gut_block_path}/TrussWire", name=f"wire_{side}_t{t}",
                         position=np.array([face_dir*(GUTTER_W/2+0.012), 0, GUTTER_D*0.45]),
                         scale=np.array([0.002, RACK_L, 0.002]),
                         color=np.array([0.6, 0.8, 0.6]))

            # ── DRIP IRRIGATION LINE (per tier) ──
            # Black PE 16mm tube running along the gutter length
            drip_z = gut_cz + 0.03  # sits on gutter surface
            drip_cx = gut_cx + face_dir * 0.02  # slightly toward outer edge
            VisualCuboid(f"/World/Racks/{side}/Drip_T{t}", name=f"drip_{side}_t{t}",
                         position=np.array([drip_cx, 0, drip_z]),
                         scale=np.array([0.016, RACK_L - 0.05, 0.016]),
                         color=DRIP_COLOR)

            # ── LED bar (Samsung LM301H, 35cm above gutter) ──
            led_z = gut_cz + 0.35
            led_cx = gut_cx
            VisualCuboid(f"/World/Racks/{side}/LED_T{t}", name=f"led_{side}_t{t}",
                         position=np.array([led_cx, 0, led_z]),
                         scale=np.array([0.05, RACK_L-0.05, 0.018]),
                         color=LED_BLACK)
            # Heat-sink fins
            for fi in range(3):
                fy = -RACK_L*0.35 + RACK_L*0.35*fi
                VisualCuboid(f"/World/Racks/{side}/Fin_T{t}_{fi}",
                             name=f"fin_{side}_t{t}_{fi}",
                             position=np.array([led_cx, fy, led_z+0.012]),
                             scale=np.array([0.045, 0.002, 0.015]),
                             color=ANODIZED_AL*0.9)

            # RectLight (grow light — Blue+Red+Far-red, Ries & Park 2024)
            # Spectrum: B90 + R250 + FR50 µmol/m²/s (ePPFD 390)
            # FR 730nm = 12% of ePPFD → leaf area +74%, yield +48%, Brix +12%
            if t < 4:
                lp = f"/World/Racks/{side}/Light_T{t}"
                rl = UsdLux.RectLight.Define(stage, lp)
                rl.CreateIntensityAttr(130.0)
                rl.CreateColorAttr(Gf.Vec3f(0.75, 0.18, 0.45))  # B+R+FR visual mix
                rl.CreateWidthAttr(RACK_L * 0.8)
                rl.CreateHeightAttr(0.04)
                xf = UsdGeom.Xformable(rl.GetPrim())
                xf.ClearXformOpOrder()
                xf.AddTranslateOp().Set(Gf.Vec3d(led_cx, 0, led_z - 0.01))

            # ── Plants: Crown at OUTER EDGE + Berries HANGING BELOW ──
            pc = PPT // 2
            for pi in range(pc):
                py = -RACK_L/2 + RACK_L*(pi+0.5)/pc

                # Crown/leaf cluster — pushed tightly out to the aisle limits
                crown_x = gut_cx + face_dir * (GUTTER_W/2 + 0.02)
                crown_z = gut_cz + 0.04
                VisualSphere(f"/World/Racks/{side}/Cr_T{t}_P{pi}",
                             name=f"cr_{side}_t{t}_{pi}",
                             position=np.array([crown_x, py, crown_z]),
                             radius=0.04, color=LEAF_GREEN)

                # Fruit HANGING BELOW gutter — firmly in the aisle workspace
                berry_x = crown_x + face_dir * 0.04  # furthest reach into aisle
                berry_z = gut_cz - 0.08  # Hangs well below the gutter base

                # Drip emitter at each plant (red button on drip line)
                VisualSphere(f"/World/Racks/{side}/Em_T{t}_P{pi}",
                             name=f"em_{side}_t{t}_{pi}",
                             position=np.array([drip_cx, py, drip_z + 0.01]),
                             radius=0.006, color=EMITTER_CLR)

                if (t+pi) % 3 == 0:  # ~33% ripe (red, large)
                    prim_path = f"/World/Racks/{side}/By_T{t}_P{pi}"
                    usd_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "strawberry.usd")
                    # Fallback to absolute if needed
                    # usd_path = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\assets\strawberry.usd"
                    
                    if os.path.exists(usd_path):
                        berry_xform = UsdGeom.Xform.Define(stage, prim_path)
                        berry_prim = berry_xform.GetPrim()
                        berry_prim.GetReferences().AddReference(usd_path)
                        xf = berry_xform.AddTranslateOp()
                        xf.Set(Gf.Vec3d(berry_x, py, berry_z))
                        rot = berry_xform.AddRotateXYZOp()
                        rot.Set(Gf.Vec3d(180, 0, (t+pi)*45)) # Hang downwards
                        scale = berry_xform.AddScaleOp()
                        scale.Set(Gf.Vec3d(1.0, 1.0, 1.0))
                    else:
                        berry_prim = VisualSphere(prim_path, name=f"by_{side}_t{t}_{pi}", position=np.array([berry_x, py, berry_z]), radius=0.020, color=BERRY_RED).prim
                        
                    semAPI = Semantics.SemanticsAPI.Apply(berry_prim, "Semantics")
                    semAPI.CreateSemanticTypeAttr().Set("class")
                    semAPI.CreateSemanticDataAttr().Set("strawberry_ripe")
                    # Stem connecting crown to berry
                    VisualCuboid(f"/World/Racks/{side}/Stm_T{t}_P{pi}",
                                 name=f"stm_{side}_t{t}_{pi}",
                                 position=np.array([crown_x + face_dir*0.015, py, gut_cz - 0.01]),
                                 scale=np.array([0.004, 0.004, 0.08]),
                                 color=np.array([0.25, 0.45, 0.15]))
                elif (t+pi) % 3 == 1:  # ~33% unripe (white, small)
                    prim_path = f"/World/Racks/{side}/By_T{t}_P{pi}"
                    usd_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "strawberry.usd")
                    
                    if os.path.exists(usd_path):
                        berry_xform = UsdGeom.Xform.Define(stage, prim_path)
                        berry_prim = berry_xform.GetPrim()
                        berry_prim.GetReferences().AddReference(usd_path)
                        xf = berry_xform.AddTranslateOp()
                        xf.Set(Gf.Vec3d(berry_x, py, berry_z + 0.02))
                        rot = berry_xform.AddRotateXYZOp()
                        rot.Set(Gf.Vec3d(180, 0, (t+pi)*45 + 15)) # Hang downwards with offset
                        scale = berry_xform.AddScaleOp()
                        scale.Set(Gf.Vec3d(0.65, 0.65, 0.65)) # 65% scale for unripe
                    else:
                        berry_prim = VisualSphere(prim_path, name=f"by_{side}_t{t}_{pi}", position=np.array([berry_x, py, berry_z + 0.02]), radius=0.013, color=BERRY_WHITE).prim
                        
                    semAPI = Semantics.SemanticsAPI.Apply(berry_prim, "Semantics")
                    semAPI.CreateSemanticTypeAttr().Set("class")
                    semAPI.CreateSemanticDataAttr().Set("strawberry_unripe")

            # ── BIM IOT sensor nodes (3 per tier) ──
            for iot_name, iot_y in [("In", -RACK_L/2+0.05), ("Mid", 0), ("Ex", RACK_L/2-0.05)]:
                ix = gut_cx + face_dir * 0.02
                iz = gut_cz + 0.10
                VisualCuboid(f"/World/Racks/{side}/IOT_T{t}_{iot_name}",
                             name=f"iot_{side}_t{t}_{iot_name.lower()}",
                             position=np.array([ix, iot_y, iz]),
                             scale=np.array([0.025, 0.035, 0.015]), color=SENSOR_GRN)
                VisualSphere(f"/World/Racks/{side}/IOTL_T{t}_{iot_name}",
                             name=f"iotl_{side}_t{t}_{iot_name.lower()}",
                             position=np.array([ix+face_dir*0.013, iot_y, iz+0.005]),
                             radius=0.003, color=np.array([0.1, 0.9, 0.1]))

        flush(6)
        print(f"   ✓ Rack {side} ({TIERS} tiers, drip irrigation, {TIERS*3} IOT)")

    # Drain trays under each rack
    for side, rx, face_dir in rack_data:
        VisualCuboid(f"/World/Racks/{side}/Tray", name=f"tray_{side.lower()}",
                     position=np.array([rx, 0, T_BASE-0.08]),
                     scale=np.array([RACK_D+0.1, RACK_L+0.05, 0.02]), color=SS_METAL*0.9)

    # ── Drip Irrigation Header (connects all tiers) ──
    # Vertical manifold pipe per rack
    for side, rx, face_dir in rack_data:
        header_x = rx + face_dir * GUTTER_W * 0.5 + face_dir * 0.02
        header_z_top = T_BASE + (TIERS-1) * T_GAP + 0.05
        # Vertical header pipe
        VisualCuboid(f"/World/Irrig/Header_{side}", name=f"header_{side.lower()}",
                     position=np.array([header_x, -RACK_L/2 + 0.03, (T_BASE + header_z_top)/2]),
                     scale=np.array([0.020, 0.020, header_z_top - T_BASE + 0.10]),
                     color=np.array([0.3, 0.3, 0.32]))
        # T-fittings at each tier
        for t in range(TIERS):
            tz = T_BASE + t * T_GAP + 0.03
            VisualCuboid(f"/World/Irrig/Tee_{side}_T{t}", name=f"tee_{side.lower()}_t{t}",
                         position=np.array([header_x, -RACK_L/2 + 0.03, tz]),
                         scale=np.array([0.03, 0.03, 0.015]),
                         color=np.array([0.25, 0.25, 0.28]))
    flush(4)

    # ═══════════════════════════════════════════════════════════
    # 6. HVAC — PE Perforated Duct + AC + Humidifier + Exhaust
    #    Ref: Zhang & Kacira 2016 (DOI: 10.1016/j.biosystemseng.2016.04.012)
    #    - PE perforated duct delivers uniform 0.3-0.5 m/s at canopy
    #    - Airflow uniformity coefficient > 0.90 (CFD validated)
    #    - Prevents hot spots between tiers (Zhang 2016 Fig.4)
    #    HVAC sizing: Chaichana et al. 2020 — each LED watt → 0.55W heat
    #    Tropical load: 250-350 kWh/m²/yr (Graamans 2018)
    # ═══════════════════════════════════════════════════════════
    print("🌬️  [LOD 400] HVAC — PE perforated duct (Zhang & Kacira 2016)...")
    duct_z = ROOM_H - 0.15
    DUCT_DIAM = 0.20  # 200mm PE duct
    HOLE_DIAM = 0.025  # 25mm perforation holes

    # PE perforated ducts (Double Aisle ceiling)
    # Main duct bodies — rigid PE pipes directly over Aisles
    aisle_xs = [-1.0, 1.0]
    for idx, aisle_x in enumerate(aisle_xs):
        duct_prefix = f"Aisle{idx+1}"
        VisualCuboid(f"/World/HVAC/PEDuct_{duct_prefix}", name=f"pe_duct_{duct_prefix.lower()}",
                     position=np.array([aisle_x, 0, duct_z]),
                     scale=np.array([DUCT_DIAM, ROOM_D * 0.85, DUCT_DIAM]),
                     color=PE_DUCT_WHT)
        # Duct end caps
        for ei, ey in enumerate([-ROOM_D*0.425, ROOM_D*0.425]):
            VisualCuboid(f"/World/HVAC/DuctCap_{duct_prefix}_{ei}", name=f"duct_cap_{duct_prefix.lower()}_{ei}",
                         position=np.array([aisle_x, ey, duct_z]),
                         scale=np.array([DUCT_DIAM + 0.01, 0.008, DUCT_DIAM + 0.01]),
                         color=PE_DUCT_WHT * 0.9)

        # CFD-optimized perforation holes (alternating left/right rows)
        hole_spacing = 0.12  # 120mm center-to-center
        n_holes = int(ROOM_D * 0.75 / hole_spacing)
        for hi in range(n_holes):
            hy = -ROOM_D * 0.375 + hi * hole_spacing
            # Left-side holes (toward left face of aisle)
            VisualSphere(f"/World/HVAC/Hole_{duct_prefix}_L_{hi}", name=f"hole_{duct_prefix.lower()}_l_{hi}",
                         position=np.array([aisle_x - DUCT_DIAM/2 + 0.01, hy, duct_z - 0.04]),
                         radius=HOLE_DIAM/2, color=np.array([0.15, 0.15, 0.18]))
            # Right-side holes (toward right face of aisle)
            VisualSphere(f"/World/HVAC/Hole_{duct_prefix}_R_{hi}", name=f"hole_{duct_prefix.lower()}_r_{hi}",
                         position=np.array([aisle_x + DUCT_DIAM/2 - 0.01, hy, duct_z - 0.04]),
                         radius=HOLE_DIAM/2, color=np.array([0.15, 0.15, 0.18]))
    # Duct hangers (galvanized steel brackets)
    for hi in range(5):
        hy = -ROOM_D*0.35 + ROOM_D*0.7*hi/4
        VisualCuboid(f"/World/HVAC/Hanger_{hi}", name=f"hanger_{hi}",
                     position=np.array([0, hy, ROOM_H-0.05]),
                     scale=np.array([0.25, 0.02, 0.10]), color=SS_METAL)
        # U-bolt clamp on duct
        VisualCuboid(f"/World/HVAC/Clamp_{hi}", name=f"clamp_{hi}",
                     position=np.array([0, hy, duct_z + DUCT_DIAM/2 + 0.005]),
                     scale=np.array([DUCT_DIAM + 0.04, 0.015, 0.015]),
                     color=SS_METAL * 0.85)

    # AC plenum connector (duct → AC unit)
    VisualCuboid("/World/HVAC/Plenum", name="plenum",
                 position=np.array([0, -ROOM_D*0.425 - 0.08, duct_z]),
                 scale=np.array([0.25, 0.15, 0.22]),
                 color=PE_DUCT_WHT * 0.95)

    # Split AC unit (sized per Chaichana 2020: LED heat = 0.55 × electrical W)
    ac_y = -ROOM_D/2 + 0.08
    ac_z = ROOM_H - 0.35
    VisualCuboid("/World/HVAC/AC", name="ac",
                 position=np.array([0, ac_y, ac_z]),
                 scale=np.array([0.85, 0.20, 0.30]), color=AC_WHITE)
    # Louvers
    for lv in range(6):
        lz = ac_z - 0.12 + lv*0.04
        VisualCuboid(f"/World/HVAC/Louver_{lv}", name=f"louver_{lv}",
                     position=np.array([0, ac_y+0.10, lz]),
                     scale=np.array([0.75, 0.005, 0.015]), color=AC_WHITE*0.92)
    # AC LED
    VisualSphere("/World/HVAC/AC_LED", name="ac_led",
                 position=np.array([0.35, ac_y+0.101, ac_z+0.12]),
                 radius=0.006, color=np.array([0.1, 0.8, 0.2]))

    # Humidifier (target RH 72% day / 75% night → VPD 1.0 kPa)
    hum_x = ROOM_W/2 - 0.20
    hum_y = -ROOM_D/2 + 0.25
    VisualCuboid("/World/HVAC/Hum", name="hum",
                 position=np.array([hum_x, hum_y, 0.20]),
                 scale=np.array([0.20, 0.20, 0.40]), color=AC_WHITE*0.95)
    # Nozzle
    VisualCuboid("/World/HVAC/Nozzle", name="nozzle",
                 position=np.array([hum_x, hum_y, 0.42]),
                 scale=np.array([0.04, 0.04, 0.06]), color=SS_METAL)

    # Dehumidifier (condensate → recycled irrigation water, Kikuchi 2018)
    dehum_x = -ROOM_W/2 + 0.20
    dehum_y = -ROOM_D/2 + 0.25
    VisualCuboid("/World/HVAC/Dehum", name="dehum",
                 position=np.array([dehum_x, dehum_y, 0.18]),
                 scale=np.array([0.22, 0.18, 0.35]), color=AC_WHITE)
    VisualCuboid("/World/HVAC/DehumDrain", name="dehum_drain",
                 position=np.array([dehum_x, dehum_y + 0.12, 0.05]),
                 scale=np.array([0.016, 0.16, 0.016]),
                 color=np.array([0.3, 0.3, 0.32]))
    # Dehumidifier label indicator
    VisualSphere("/World/HVAC/DehumLED", name="dehum_led",
                 position=np.array([dehum_x + 0.08, dehum_y - 0.09, 0.30]),
                 radius=0.005, color=np.array([0.2, 0.6, 0.9]))

    # Exhaust fan
    VisualCuboid("/World/HVAC/ExFan", name="exfan",
                 position=np.array([ROOM_W/2+T, 0, ROOM_H*0.75]),
                 scale=np.array([0.08, 0.24, 0.24]), color=np.array([0.3, 0.3, 0.32]))
    VisualCuboid("/World/HVAC/FanGuard", name="fanguard",
                 position=np.array([ROOM_W/2+T+0.05, 0, ROOM_H*0.75]),
                 scale=np.array([0.01, 0.26, 0.26]), color=SS_METAL)
    flush(4)
    print("   ✓ PE perforated duct (CFD, Zhang 2016) + AC + Dehumidifier + Exhaust")

    # ═══════════════════════════════════════════════════════════
    # 7. CO2 INJECTION — Crop-Local Enrichment
    #    Ref: Hidaka et al. 2022 (DOI: 10.1016/j.scienta.2022.111104)
    #    - Crop-local CO₂ at 800-1000 ppm → yield +22%
    #    - Release at canopy level, NOT at ceiling
    #    Ref: Wada et al. 2010 (DOI: 10.1626/jcs.79.192)
    #    - Optimal CO₂ × Light × Temp for Tochiotome photosynthesis
    # ═══════════════════════════════════════════════════════════
    print("🫧 [LOD 400] CO2 crop-local enrichment (Hidaka 2022)...")
    co2_x = -ROOM_W/2 + 0.15
    co2_y = -ROOM_D/2 + 0.15
    # Tank
    VisualCuboid("/World/CO2/Tank", name="co2_tank",
                 position=np.array([co2_x, co2_y, 0.30]),
                 scale=np.array([0.16, 0.16, 0.60]), color=CO2_GREEN)
    # Regulator + timer (controlled release at crop level)
    VisualCuboid("/World/CO2/Reg", name="co2_reg",
                 position=np.array([co2_x, co2_y, 0.63]),
                 scale=np.array([0.06, 0.06, 0.05]), color=SS_METAL)
    # Solenoid valve with timer
    VisualCuboid("/World/CO2/Solenoid", name="co2_solenoid",
                 position=np.array([co2_x + 0.05, co2_y, 0.58]),
                 scale=np.array([0.04, 0.04, 0.04]),
                 color=np.array([0.20, 0.20, 0.25]))
    VisualSphere("/World/CO2/SolLED", name="co2_sol_led",
                 position=np.array([co2_x + 0.07, co2_y, 0.60]),
                 radius=0.004, color=np.array([0.1, 0.9, 0.1]))

    # Feed line to PE duct (general distribution)
    VisualCuboid("/World/CO2/Feed", name="co2_feed",
                 position=np.array([co2_x, co2_y, (0.63+duct_z)/2]),
                 scale=np.array([0.016, 0.016, duct_z-0.63]), color=np.array([0.3, 0.3, 0.3]))

    # Crop-local CO₂ distribution nozzles (at tier canopy level)
    # Hidaka 2022: release CO₂ directly at crop level, not at ceiling
    for side, rx, face_dir in rack_data:
        for t in range(min(TIERS, 4)):  # Top 4 tiers get CO₂ nozzles
            tz = T_BASE + t * T_GAP + 0.12  # canopy level
            noz_x = rx + face_dir * 0.05
            VisualCuboid(f"/World/CO2/CropNoz_{side}_T{t}", name=f"co2_noz_{side.lower()}_t{t}",
                         position=np.array([noz_x, 0, tz]),
                         scale=np.array([0.02, 0.015, 0.015]),
                         color=CO2_GREEN * 1.3)
    flush(4)
    print("   ✓ CO2 crop-local system (Hidaka 2022) + canopy nozzles")

    # ═══════════════════════════════════════════════════════════
    # 8. IRRIGATION — NFT Recirculating + Yamazaki Formula
    #    Ref: Ries & Park 2024 — Yamazaki nutrient formula
    #         N77/P23/K116/Ca40/Mg12/S48 mg/L
    #    Ref: AJCS 2025 — EC 2.0-4.0 dS/m for Tochiotome
    #    Ref: Giannothanasis 2024 — Na⁺ monitoring algorithm
    # ═══════════════════════════════════════════════════════════
    print("💧 [LOD 400] NFT irrigation (Yamazaki formula, AJCS EC)...")
    tank_x = ROOM_W/2 - 0.25
    tank_y = ROOM_D/2 - 0.30
    # Reservoir
    VisualCuboid("/World/Irrig/Tank", name="tank",
                 position=np.array([tank_x, tank_y, 0.20]),
                 scale=np.array([0.40, 0.50, 0.40]), color=TANK_BLUE)
    VisualCuboid("/World/Irrig/Lid", name="lid",
                 position=np.array([tank_x, tank_y, 0.41]),
                 scale=np.array([0.42, 0.52, 0.015]), color=TANK_BLUE*1.1)
    # EC/pH probe (target EC 2.2 veg → 4.0 brix boost)
    VisualCuboid("/World/Irrig/Probe", name="probe",
                 position=np.array([tank_x+0.12, tank_y, 0.15]),
                 scale=np.array([0.024, 0.024, 0.25]), color=SENSOR_GRN)
    # Na⁺ sensor (Bangpakong saline intrusion monitoring)
    VisualCuboid("/World/Irrig/NaProbe", name="na_probe",
                 position=np.array([tank_x+0.16, tank_y, 0.12]),
                 scale=np.array([0.018, 0.018, 0.20]),
                 color=np.array([0.60, 0.30, 0.10]))
    VisualSphere("/World/Irrig/NaLED", name="na_led",
                 position=np.array([tank_x+0.16, tank_y - 0.015, 0.23]),
                 radius=0.004, color=np.array([0.9, 0.5, 0.1]))
    # Pump
    VisualCuboid("/World/Irrig/Pump", name="pump",
                 position=np.array([tank_x, tank_y-0.30, 0.08]),
                 scale=np.array([0.10, 0.06, 0.06]), color=np.array([0.2, 0.2, 0.22]))
    # Dosing pumps (A/B/pH) — Yamazaki formula: N77/P23/K116/Ca40/Mg12
    for di, dl in enumerate(["A", "B", "pH"]):
        dx = tank_x - 0.15 + di*0.10
        VisualCuboid(f"/World/Irrig/Dos_{dl}", name=f"dos_{dl.lower()}",
                     position=np.array([dx, tank_y+0.30, 0.15]),
                     scale=np.array([0.04, 0.04, 0.08]),
                     color=np.array([0.15+di*0.15, 0.25, 0.40]))
    # RO filter unit (for Na⁺ > 2 mmol/L, Giannothanasis 2024)
    VisualCuboid("/World/Irrig/RO", name="ro_filter",
                 position=np.array([tank_x - 0.25, tank_y, 0.18]),
                 scale=np.array([0.12, 0.12, 0.35]),
                 color=np.array([0.80, 0.82, 0.85]))
    VisualCuboid("/World/Irrig/ROLabel", name="ro_label",
                 position=np.array([tank_x - 0.25, tank_y - 0.065, 0.25]),
                 scale=np.array([0.08, 0.005, 0.04]),
                 color=np.array([0.20, 0.40, 0.70]))
    # Vertical riser
    riser_top = T_BASE + (TIERS-1)*T_GAP + 0.20
    VisualCuboid("/World/Irrig/Riser", name="riser",
                 position=np.array([tank_x-0.05, tank_y-0.10, riser_top/2]),
                 scale=np.array([0.024, 0.024, riser_top]), color=np.array([0.4, 0.4, 0.42]))
    # Manifold
    VisualCuboid("/World/Irrig/Manifold", name="manifold",
                 position=np.array([0, tank_y-0.10, riser_top]),
                 scale=np.array([ROOM_W*0.6, 0.020, 0.020]), color=np.array([0.4, 0.4, 0.42]))
    flush(4)
    print("   ✓ NFT system (Yamazaki formula + Na⁺ monitor + RO filter)")

    # ═══════════════════════════════════════════════════════════
    # 9. CONTROL PANEL
    # ═══════════════════════════════════════════════════════════
    print("🎛️  [LOD 400] Control panel...")
    px = ROOM_W/2 - 0.05
    py = ROOM_D/2 - 0.20
    VisualCuboid("/World/Ctrl/Panel", name="panel",
                 position=np.array([px, py, 1.30]),
                 scale=np.array([0.04, 0.40, 0.50]), color=np.array([0.25, 0.25, 0.27]))
    VisualCuboid("/World/Ctrl/DIN", name="din",
                 position=np.array([px-0.01, py, 1.40]),
                 scale=np.array([0.015, 0.35, 0.035]), color=SS_METAL)
    for bi in range(4):
        by = py - 0.12 + bi*0.08
        VisualCuboid(f"/World/Ctrl/Brk_{bi}", name=f"brk_{bi}",
                     position=np.array([px-0.025, by, 1.40]),
                     scale=np.array([0.02, 0.04, 0.06]), color=np.array([0.1, 0.1, 0.1]))
    flush(4)
    print("   ✓ Panel + DIN rail + breakers")

    # ═══════════════════════════════════════════════════════════
    # 9c. OVERHEAD XYZ GANTRY & HARVESTER (Phase 2)
    #     Mounted to the ceiling (Z=2.6m) to keep the aisle clear for Phase 1.
    print("🤖 [LOD 400] Loading Overhead XYZ Gantry (Phase 2)...")
    
    # X-Axis Rails (Running along ceiling, length=4m)
    VisualCuboid("/World/Gantry/Rail_X1", name="gantry_rail_x1", position=np.array([-0.6, 0, 2.6]), scale=np.array([0.05, 3.8, 0.05]), color=ANODIZED_AL)
    VisualCuboid("/World/Gantry/Rail_X2", name="gantry_rail_x2", position=np.array([0.6, 0, 2.6]), scale=np.array([0.05, 3.8, 0.05]), color=ANODIZED_AL)
    
    # Y-Axis Crossbar (Spanning across X rails)
    VisualCuboid("/World/Gantry/Crossbar_Y", name="gantry_crossbar", position=np.array([0, 0, 2.55]), scale=np.array([1.3, 0.08, 0.04]), color=SS_METAL)
    
    # Z-Axis Telescopic arm dropping down to the canopy
    VisualCuboid("/World/Gantry/Arm_Z", name="gantry_arm", position=np.array([0, 0, 2.0]), scale=np.array([0.06, 0.06, 1.1]), color=SS_METAL)
    
    # Placeholder for Intel RealSense & Soft-Touch Gripper
    VisualCuboid("/World/Gantry/Effector", name="gantry_effector", position=np.array([0, 0, 1.4]), scale=np.array([0.15, 0.15, 0.2]), color=DARK_RUBBER)
    VisualSphere("/World/Gantry/Camera", name="gantry_camera", position=np.array([0.08, 0, 1.35]), radius=0.03, color=np.array([0.1, 0.8, 0.9]))
    print("   ✓ Overhead XYZ Gantry initialized (Zero aisle footprint)")

    # ═══════════════════════════════════════════════════════════
    # 10. CROWN-COOLING SYSTEM — Tropical Flower Induction
    #     Ref: Hidaka et al. 2017 (DOI: 10.2525/ecb.55.21)
    #     - Crown-cooling at 20°C + short-day (8h) for 22 days
    #     - Works at 30°C ambient → critical for Bangpakong
    #     Ref: Yamasaki 2020 (DOI: 10.2503/hortj.UTD-R010)
    #     - Japanese forcing culture methods (Yarei / Kaburei)
    #
    #     Hardware: 1.5kW glycol chiller → 16mm PE tubes per tier
    #     Temperature sensor node at each crown level
    # ═══════════════════════════════════════════════════════════
    print("🧊 [LOD 400] Crown-cooling chiller (Hidaka 2017)...")

    # Chiller unit (floor-mounted, glycol-cooled)
    chiller_x = -ROOM_W/2 + 0.25
    chiller_y = ROOM_D/2 - 0.25
    # Main chiller body (1.5kW compact glycol chiller)
    VisualCuboid("/World/Chiller/Body", name="chiller_body",
                 position=np.array([chiller_x, chiller_y, 0.25]),
                 scale=np.array([0.40, 0.30, 0.50]),
                 color=CHILLER_BLU)
    # Chiller control panel
    VisualCuboid("/World/Chiller/Display", name="chiller_display",
                 position=np.array([chiller_x, chiller_y - 0.155, 0.38]),
                 scale=np.array([0.15, 0.005, 0.08]),
                 color=np.array([0.05, 0.05, 0.08]))  # Dark LCD
    VisualSphere("/World/Chiller/LED", name="chiller_led",
                 position=np.array([chiller_x + 0.12, chiller_y - 0.155, 0.38]),
                 radius=0.005, color=np.array([0.1, 0.7, 0.9]))  # Cyan = cooling active
    # Chiller feet
    for fi, (fx, fy) in enumerate([(-0.15,-0.10),(0.15,-0.10),(-0.15,0.10),(0.15,0.10)]):
        VisualCuboid(f"/World/Chiller/Foot_{fi}", name=f"chiller_foot_{fi}",
                     position=np.array([chiller_x+fx, chiller_y+fy, 0.015]),
                     scale=np.array([0.04, 0.04, 0.03]),
                     color=DARK_RUBBER)

    # Supply manifold (chiller → distribution header)
    supply_z = 0.50
    VisualCuboid("/World/Chiller/SupplyPipe", name="supply_pipe",
                 position=np.array([chiller_x, chiller_y - 0.20, supply_z]),
                 scale=np.array([0.020, 0.12, 0.020]),
                 color=COOL_TUBE)
    # Vertical riser (supply)
    riser_top_cool = T_BASE + (TIERS-1) * T_GAP + 0.05
    VisualCuboid("/World/Chiller/SupplyRiser", name="supply_riser",
                 position=np.array([chiller_x, chiller_y - 0.30, (supply_z + riser_top_cool)/2]),
                 scale=np.array([0.020, 0.020, riser_top_cool - supply_z]),
                 color=COOL_TUBE)

    # Return manifold (parallel pipe)
    VisualCuboid("/World/Chiller/ReturnRiser", name="return_riser",
                 position=np.array([chiller_x + 0.06, chiller_y - 0.30, (supply_z + riser_top_cool)/2]),
                 scale=np.array([0.020, 0.020, riser_top_cool - supply_z]),
                 color=COOL_TUBE * 0.85)  # Slightly darker = return

    # Cooling tubes running into each tier gutter (all 4 racks)
    for side, rx, face_dir in rack_data:
        for t in range(TIERS):
            tz = T_BASE + t * T_GAP + 0.025  # Crown level in gutter
            gut_cx = rx + face_dir * GUTTER_W * 0.5
            # Cooling tube running along gutter length (PE 16mm)
            VisualCuboid(f"/World/Chiller/Tube_{side}_T{t}", name=f"cool_tube_{side.lower()}_t{t}",
                         position=np.array([gut_cx - face_dir * 0.04, 0, tz]),
                         scale=np.array([0.016, RACK_L - 0.10, 0.016]),
                         color=COOL_TUBE)
            # T-connector at tier entry
            VisualCuboid(f"/World/Chiller/Tee_{side}_T{t}", name=f"cool_tee_{side.lower()}_t{t}",
                         position=np.array([gut_cx - face_dir * 0.04, -RACK_L/2 + 0.05, tz]),
                         scale=np.array([0.025, 0.025, 0.012]),
                         color=COOL_TUBE * 0.9)
            # Crown temperature sensor (per tier)
            VisualSphere(f"/World/Chiller/TempSensor_{side}_T{t}",
                         name=f"crown_temp_{side.lower()}_t{t}",
                         position=np.array([gut_cx, RACK_L/4, tz + 0.02]),
                         radius=0.006,
                         color=np.array([0.9, 0.3, 0.1]))  # Orange = temp sensor

    flush(6)
    print(f"   ✓ Crown-cooling: chiller + {TIERS*4} tier tubes + {TIERS*4} temp sensors")

    # ═══════════════════════════════════════════════════════════
    # 11. CAMERA
    # ═══════════════════════════════════════════════════════════
    print("📸 Setting camera...")
    cam = UsdGeom.Camera.Define(stage, "/World/Cam/Architect")
    cam.CreateFocalLengthAttr(24.0)
    xf = UsdGeom.Xformable(cam.GetPrim())
    xf.ClearXformOpOrder()
    xf.AddTranslateOp().Set(Gf.Vec3d(3.5, 4.0, 2.8))
    xf.AddRotateXYZOp().Set(Gf.Vec3d(-25, 35, 0))
    flush(4)

    # ═══════════════════════════════════════════════════════════
    # 12. STATS
    # ═══════════════════════════════════════════════════════════
    iot_total = TIERS * 4 * 3
    temp_sensors = TIERS * 4
    plant_total = (PPT//2) * TIERS * 4
    co2_nozzles = min(TIERS, 4) * 4

    # ═══════════════════════════════════════════════════════════
    # 13. [Phase 1 Replicator Pipeline — DISABLED for Phase 3 Physics Run]
    # ═══════════════════════════════════════════════════════════
    print("🧠 [LOD 400] Skipping Replicator Dataset pipeline (Physics prioritized)...")
    print("   ✓ Writer skipped.")
    print("\n" + "="*65)
    print("  FARMBASE V7.0 — FULL DIGITAL TWIN WITH THERMODYNAMICS")
    print("="*65)
    print(f"  Room:         {ROOM_W}×{ROOM_D}×{ROOM_H}m PIR sealed PFAL")
    print(f"  Location:     Bangpakong, Chachoengsao, Thailand")
    print(f"  Racks:        2× Oishii flat gutter (5° NFT slope, {TIERS} tiers)")
    print(f"  Plants:       {plant_total} Tochiotome crowns")
    print(f"  IOT Nodes:    {iot_total} BIM + {temp_sensors} crown-temp sensors")
    print(f"  LEDs:         {TIERS*2}× Samsung LM301H B90+R250+FR50 (Ries 2024)")
    print(f"  HVAC:         PE perforated duct (Zhang 2016) + AC + Dehumidifier")
    print(f"  Cooling:      1.5kW glycol chiller → {TIERS*2} crown-cooling tubes")
    print(f"  CO₂:          Crop-local enrichment, {co2_nozzles} canopy nozzles")
    print(f"  Irrigation:   NFT + Yamazaki formula + Na⁺ monitor + RO filter")
    print(f"  Pollination:  VPD 2.06 kPa + 800/100Hz vibration (Liang 2025)")
    print(f"  Robot:        Overhead XYZ Gantry + Intel RealSense Vision")
    print(f"  Research:     18 DOI-verified papers")
    print("="*65)

    print("\n✅ Farmbase v4.0 is live. Close the window to exit.")
    
    # ═══════════════════════════════════════════════════════════
    # 14. V6.0 AUTO-CAPEX (BOM) & INVESTMENT CALCULATION
    # ═══════════════════════════════════════════════════════════
    print("💰 [LOD 400] Calculating CapEx Bill of Materials (BOM) from Digital Twin...")
    import csv

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
        [f"Galvanized Rack ({RACK_L}m x {RACK_D}m)", 4, 2500.0],
        [f"PVC NFT Gutter {RACK_L}m (pcs)", 4 * TIERS * 2, 150.0 * RACK_L],
        ["Samsung LM301H LED Board Full Spec", 4 * TIERS, 1500.0],
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

    print("\n" + "="*65)
    print(f"  💰 CAPEX AUTO-CALCULATED FROM DIGITAL TWIN")
    print(f"  TOTAL CAPITAL EXPENDITURE: {total_investment:,.2f} THB")
    print(f"  Saved detailed BOM to: _output/capex_investment.csv")
    print("="*65)

    
    # ═══════════════════════════════════════════════════════════
    # 15. V7.0 CLIMATE ENGINE & VIRTUAL PLC (THERMODYNAMICS)
    # ═══════════════════════════════════════════════════════════
    
    # ═══════════════════════════════════════════════════════════
    # 🌟 V3 PHASE 3: GOD-TIER ROBOTICS (RMPFLOW & AI VISION LOOP)
    # ═══════════════════════════════════════════════════════════
    print("🦾 [Phase 3] Booting up God-Tier Robotics Core (Lula kinematics)...")
    import omni.ui as ui
    from omni.isaac.franka import Franka
    from omni.isaac.franka.controllers import RMPFlowController
    
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
            position=np.array([-0.3, 0.4, 1.2]),
            scale=np.array([0.03, 0.03, 0.03]),
            color=np.array([1.0, 0, 0])
        )
    )
    
    # Setup Harvesting Basket directly on the Gantry Carriage (Zero-Travel Drop!)
    VisualCuboid("/World/GantrySys/BridgeY/CarriageX/Basket", name="backpack_basket", position=np.array([0, -0.27, 2.0]), scale=np.array([0.3, 0.25, 0.15]), color=np.array([0.8, 0.3, 0.1]))
    # Phase 3 Franka Instantiation (MOVED TO TOP-LEVEL to fix missing Mesh/Bounds clipping)
    franka_prim_path = "/World/HarvesterFranka"
    my_franka = world.scene.add(
        Franka(
            prim_path=franka_prim_path,
            name="harvester_franka",
            position=np.array([0, 0, rail_z - 0.20]), # Attach exactly at Dropper Z height
            orientation=np.array([0, 0.7071068, 0.7071068, 0]) # Invert on Y-axis to hang upside down
        )
    )
    
    arm_api = UsdGeom.XformCommonAPI(dropper_xform.GetPrim())
    arm_api.SetTranslate(Gf.Vec3d(0, 0, 2.0 - rail_z + 0.15))

    world.reset()
    
    print("⏳ Warming up Physics Core for Robot Kinematics...")
    for _ in range(15):
        world.step(render=True)
    
    try:
        # Force initialization if needed
        if hasattr(my_franka, "initialize") and not my_franka.initialized:
            my_franka.initialize()
    except Exception as e:
        print(f"⚠️ Robot initialize note: {e}")
        
    print("🧠 Initializing RMPFlow Controller...")
    rmpflow_controller = RMPFlowController(name="franka_rmpflow", robot_articulation=my_franka)

    # Initialize variables
    start_time = time.time()
    last_ui_update = time.time()
    aisles = [-1.0, 1.0]
    current_aisle_idx = 0
    
    # FSM Constants
    STATE_PATROL = 0
    STATE_APPROACH = 1
    STATE_HARVEST = 2
    STATE_RETRACT = 3
    STATE_DROP = 4
    current_state = STATE_PATROL
    state_start_time = time.time()
    
    patrol_status = "SCANNING AISLE 1..."
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
    
    print("\n✅ FARMBASE V3 — GOD-TIER ROBOTICS LIVE. Close the window to exit.")
    
    # Our Simulated Strawberry coordinates
    harvest_target = np.array([-0.3, 0.4, 1.2]) 
    
    while simulation_app.is_running():
        now = time.time()
        
        # --- State Machine ---
        if current_state == STATE_PATROL:
            aisle_x = aisles[current_aisle_idx]
            patrol_status = f"STATE 1: PATROL AISLE {current_aisle_idx+1}"
            lbl_status.style = {"color": 0xFF00FF00, "font_size": 16}
            target_pos_str = "Searching..."
            
            elapsed = now - start_time
            gantry_y = math.sin(elapsed * 0.5) * 0.8
            # Move the bridge along Y and carriage along X
            bridge_api.SetTranslate(Gf.Vec3d(0, gantry_y, 0))
            carr_api.SetTranslate(Gf.Vec3d(aisle_x, 0, 0))
            
            # Sync top-level Franka base coordinate with Gantry
            my_franka.set_world_pose(position=np.array([aisle_x, gantry_y, rail_z - 0.20]))
            
            # Dynamically place target in current aisle
            harvest_target = np.array([aisle_x - 0.3, 0.4, 1.2])
            target_prim.set_world_pose(position=harvest_target)
            
            if abs(gantry_y - 0.4) < 0.02:
                print(f"🍓 TARGET ACQUIRED IN AISLE {current_aisle_idx+1}! SWITCHING TO APPROACH STATE...")
                current_state = STATE_APPROACH
                state_start_time = now
                # Stop Gantry
                bridge_api.SetTranslate(Gf.Vec3d(0, 0.4, 0))
                carr_api.SetTranslate(Gf.Vec3d(aisle_x, 0, 0))
                my_franka.set_world_pose(position=np.array([aisle_x, 0.4, rail_z - 0.20]))
                
        elif current_state == STATE_APPROACH:
            patrol_status = "STATE 2: RMPFLOW APPROACH"
            lbl_status.style = {"color": 0xFF00FFFF, "font_size": 16}
            
            aisle_x = aisles[current_aisle_idx]
            harvest_target = np.array([aisle_x - 0.3, 0.4, 1.2])
            target_pos_str = f"X:{harvest_target[0]:.2f} Y:{harvest_target[1]:.2f} Z:{harvest_target[2]:.2f}"
            
            # Offset by 15cm from target
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
            
            aisle_x = aisles[current_aisle_idx]
            harvest_target = np.array([aisle_x - 0.3, 0.4, 1.2])
            
            actions = rmpflow_controller.forward(
                target_end_effector_position=harvest_target,
            )
            my_franka.apply_action(actions)
            
            # Simulated Cut (Close gripper after 1.5s)
            if now - state_start_time > 1.5:
                 my_franka.gripper.apply_action(my_franka.gripper.forward(action="close"))
            
            if now - state_start_time > 3.0:
                current_state = STATE_RETRACT
                state_start_time = now
                
        elif current_state == STATE_RETRACT:
            patrol_status = "STATE 4: MOVING TO BACKPACK BASKET"
            lbl_status.style = {"color": 0xFFFFAA00, "font_size": 16}
            
            # Read Robot current Base Position
            current_base_pos, _ = my_franka.get_world_pose()
            base_x = current_base_pos[0]
            base_y = current_base_pos[1]
            target_pos_str = f"X:{base_x:.2f} Y:{base_y-0.27:.2f} Z:2.15"
            
            # Move hand to backpack basket
            tray_pos = np.array([base_x, base_y - 0.27, 2.15])
            actions = rmpflow_controller.forward(
                target_end_effector_position=tray_pos,
            )
            my_franka.apply_action(actions)
            
            if now - state_start_time > 3.0:
                current_state = STATE_DROP
                state_start_time = now
                
        elif current_state == STATE_DROP:
            patrol_status = "STATE 5: RELEASING PAYLOAD"
            lbl_status.style = {"color": 0xFF00FF00, "font_size": 16}
            
            current_base_pos, _ = my_franka.get_world_pose()
            base_x = current_base_pos[0]
            base_y = current_base_pos[1]
            tray_pos = np.array([base_x, base_y - 0.27, 2.15])
            
            # Keep holding steady over basket
            actions = rmpflow_controller.forward(target_end_effector_position=tray_pos)
            my_franka.apply_action(actions)
            
            # Open gripper
            my_franka.gripper.apply_action(my_franka.gripper.forward(action="open"))
            
            if now - state_start_time > 1.0:
                current_state = STATE_PATROL
                start_time = now # reset time so wave starts over
                
                # Switch Aisle for the next wave
                current_aisle_idx = (current_aisle_idx + 1) % len(aisles)

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
