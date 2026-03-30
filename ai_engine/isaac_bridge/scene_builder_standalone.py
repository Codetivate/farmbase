"""
Farmbase Micro PFAL — Isaac Sim Standalone Scene Builder
==========================================================
Run directly: C:\\Users\\nesnk\\Desktop\\isaac-sim\\python.bat scene_builder_standalone.py

Supports two modes:
  1. Default: Reads farm_config.json from script directory
  2. CLI:    --config <path> --output-dir <path> --job-id <id>

สร้างห้อง PFAL พร้อม rack, gutter, LED, AC
Export เป็น USD file สำหรับเปิดใน Isaac Sim GUI ภายหลัง

⚠️  ต้องปิด Isaac Sim GUI ก่อนรัน (ไม่สามารถรัน 2 instances พร้อมกัน)
"""

import argparse
import os
import sys
import json
import traceback

# ══════════════════════════════════════════════
# 0. Parse CLI Arguments (BEFORE Isaac init)
# ══════════════════════════════════════════════
parser = argparse.ArgumentParser(description="Farmbase Isaac Sim Scene Builder")
parser.add_argument("--config", default=None, help="Path to farm_config.json")
parser.add_argument("--output-dir", default=None, help="Output directory for .usd")
parser.add_argument("--job-id", default=None, help="Job ID for unique filenames")
parser.add_argument("--headless", action="store_true", default=True, help="Run headless")
parser.add_argument("--render", action="store_true", default=False, help="Capture RTX render")

args = parser.parse_args()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = args.config or os.path.join(SCRIPT_DIR, "farm_config.json")
OUTPUT_DIR = args.output_dir or os.path.join(SCRIPT_DIR, "output")
JOB_ID = args.job_id or "default"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ══════════════════════════════════════════════
# 1. Initialize Isaac Sim (MUST be first)
# ══════════════════════════════════════════════
try:
    from isaacsim import SimulationApp

    SIM_CONFIG = {"headless": args.headless, "width": 1280, "height": 720}
    simulation_app = SimulationApp(SIM_CONFIG)
    print("✅ Isaac Sim initialized (headless mode)")
except ImportError as e:
    print(f"❌ Isaac Sim not available: {e}")
    print("   This script must be run with Isaac Sim's python.bat")
    sys.exit(1)
except Exception as e:
    print(f"❌ Isaac Sim initialization failed: {e}")
    traceback.print_exc()
    sys.exit(1)

# ══════════════════════════════════════════════
# 2. Import Omniverse APIs (AFTER SimulationApp)
# ══════════════════════════════════════════════
import omni.usd
from pxr import Usd, UsdGeom, UsdShade, UsdPhysics, Gf, Sdf, UsdLux
from omni.isaac.core import World
from omni.isaac.core.utils.prims import create_prim
import numpy as np

# ══════════════════════════════════════════════
# 3. Load Config
# ══════════════════════════════════════════════
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        farm_cfg = json.load(f)
    print(f"📄 Loaded config: {CONFIG_PATH}")
else:
    farm_cfg = {}
    print("⚠️  No config found, using defaults")

room = farm_cfg.get("room", {})
racks_cfg = farm_cfg.get("racks", {})
lighting_cfg = farm_cfg.get("lighting", {})
climate_cfg = farm_cfg.get("climate", {})
crop_cfg = farm_cfg.get("crop", {})

ROOM_W = room.get("width", 2.0)
ROOM_D = room.get("depth", 2.0)
ROOM_H = room.get("height", 2.8)
WALL_T = room.get("wall_thickness", 0.05)

RACK_COUNT = racks_cfg.get("count", 1)
TIERS = racks_cfg.get("tiers_per_rack", 3)
TIER_HEIGHTS = racks_cfg.get("tier_heights", [0.40, 0.80, 1.20])
GUTTER_LEN = racks_cfg.get("gutter", {}).get("length", 1.50)
GUTTER_W = racks_cfg.get("gutter", {}).get("width", 0.10)
GUTTER_D = racks_cfg.get("gutter", {}).get("depth", 0.04)
PLANTS_PER_GUTTER = racks_cfg.get("plants_per_gutter", 7)
LED_OFFSET = 0.18
LED_WATTS = lighting_cfg.get("watts_per_bar", 40)

# Robot config
robot_cfg = farm_cfg.get("robot", {})
HAS_ROBOT = robot_cfg.get("enabled", True)

# ══════════════════════════════════════════════
# 4. Create World + Scene
# ══════════════════════════════════════════════
world = World()
stage = omni.usd.get_context().get_stage()

# Set Z-up and meters
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)
UsdGeom.SetStageMetersPerUnit(stage, 1.0)

print(f"🌱 Building PFAL: {ROOM_W}m × {ROOM_D}m × {ROOM_H}m")
print(f"   Racks: {RACK_COUNT} × {TIERS} tiers")
print(f"   Gutters: {GUTTER_LEN}m × {GUTTER_W*100:.0f}cm")

# ── Colors ──
COL_FLOOR  = Gf.Vec3f(0.92, 0.92, 0.90)
COL_WALL   = Gf.Vec3f(0.85, 0.87, 0.90)
COL_CEIL   = Gf.Vec3f(0.95, 0.95, 0.95)
COL_STEEL  = Gf.Vec3f(0.70, 0.72, 0.74)
COL_PVC    = Gf.Vec3f(0.96, 0.96, 0.96)
COL_LED    = Gf.Vec3f(1.00, 0.85, 0.95)
COL_AC     = Gf.Vec3f(0.90, 0.90, 0.92)
COL_DOOR   = Gf.Vec3f(0.45, 0.47, 0.50)
COL_PLANT  = Gf.Vec3f(0.20, 0.70, 0.30)
COL_ROBOT  = Gf.Vec3f(0.25, 0.30, 0.35)

W, D, H = ROOM_W, ROOM_D, ROOM_H
hw, hd = W/2, D/2

def box(parent, name, sx, sy, sz, px, py, pz, color=None):
    """Create a box as scaled cube with color."""
    path = f"{parent}/{name}"
    xf = UsdGeom.Xform.Define(stage, path)
    xf.AddTranslateOp().Set(Gf.Vec3d(px, py, pz))
    
    cube = UsdGeom.Cube.Define(stage, f"{path}/mesh")
    cube.AddScaleOp().Set(Gf.Vec3f(sx/2, sy/2, sz/2))
    if color:
        cube.GetDisplayColorAttr().Set([color])
    
    # Auto-add collision
    UsdPhysics.CollisionAPI.Apply(cube.GetPrim())
    return path

def sphere(parent, name, radius, px, py, pz, color=None):
    """Create a sphere."""
    path = f"{parent}/{name}"
    xf = UsdGeom.Xform.Define(stage, path)
    xf.AddTranslateOp().Set(Gf.Vec3d(px, py, pz))
    
    sph = UsdGeom.Sphere.Define(stage, f"{path}/mesh")
    sph.GetRadiusAttr().Set(radius)
    if color:
        sph.GetDisplayColorAttr().Set([color])
    
    return path


# ═══════════════════════════════════════════════
# 5. BUILD: Structure
# ═══════════════════════════════════════════════
farm = "/World/Farm"
UsdGeom.Xform.Define(stage, farm)

# Floor
box(farm, "Floor", W+0.1, D+0.1, 0.02, 0, 0, -0.01, COL_FLOOR)

# Ceiling
box(farm, "Ceiling", W+0.1, D+0.1, 0.02, 0, 0, H, COL_CEIL)

# Walls
walls = f"{farm}/Walls"
UsdGeom.Xform.Define(stage, walls)

box(walls, "Back",  W, WALL_T, H, 0, -hd, H/2, COL_WALL)
box(walls, "Left",  WALL_T, D, H, -hw, 0, H/2, COL_WALL)
box(walls, "Right", WALL_T, D, H, hw, 0, H/2, COL_WALL)

# Front wall with door gap
door_w = 0.85
side_w = (W - door_w) / 2
if side_w > 0.01:
    box(walls, "FrontL", side_w, WALL_T, H, -(hw - side_w/2), hd, H/2, COL_WALL)
    box(walls, "FrontR", side_w, WALL_T, H, (hw - side_w/2), hd, H/2, COL_WALL)
box(walls, "FrontTop", min(door_w, W), WALL_T, H-2.1, 0, hd, 2.1+(H-2.1)/2, COL_WALL)
box(walls, "Door", min(door_w, W-0.1), 0.04, 2.05, 0, hd+0.01, 2.05/2, COL_DOOR)

print("  ✓ Structure: floor, ceiling, 4 walls + door")

# ═══════════════════════════════════════════════
# 6. BUILD: Racks + Gutters + LEDs + Plants
# ═══════════════════════════════════════════════
racks_root = f"{farm}/Racks"
UsdGeom.Xform.Define(stage, racks_root)

total_plants = 0

# Calculate rack positions (distributed along perpendicular axis)
rack_footprint = GUTTER_W + 0.10
if RACK_COUNT == 1:
    rack_positions = [(0.0, 0.0)]
else:
    # Distribute racks evenly across the room width
    usable = W - 2 * WALL_T - 0.30  # wall clearance
    spacing = usable / max(1, RACK_COUNT)
    rack_positions = [
        (-usable/2 + spacing/2 + i * spacing, 0.0)
        for i in range(RACK_COUNT)
    ]

for ri, (rack_x, rack_y) in enumerate(rack_positions):
    rack = f"{racks_root}/Rack_{ri}"
    UsdGeom.Xform.Define(stage, rack)
    rx, ry = rack_x, rack_y
    
    # 4 Posts
    for pi, (px, py) in enumerate([
        (-GUTTER_LEN/2+0.05, -0.05), (-GUTTER_LEN/2+0.05, 0.05),
        (GUTTER_LEN/2-0.05, -0.05),  (GUTTER_LEN/2-0.05, 0.05)
    ]):
        post_h = TIER_HEIGHTS[-1] + 0.30
        box(rack, f"Post_{pi}", 0.025, 0.025, post_h,
            rx+px, ry+py, post_h/2, COL_STEEL)

    # Tiers
    for ti, th in enumerate(TIER_HEIGHTS):
        tier = f"{rack}/Tier_{ti}"
        UsdGeom.Xform.Define(stage, tier)
        
        # ── U-Channel NFT Gutter ──
        # Base
        box(tier, "GutterBase", GUTTER_LEN, GUTTER_W, 0.005,
            rx, ry, th - GUTTER_D/2 + 0.0025, COL_PVC)
        # Side walls
        box(tier, "GutterSideL", GUTTER_LEN, 0.002, GUTTER_D,
            rx, ry - GUTTER_W/2 + 0.001, th, COL_PVC)
        box(tier, "GutterSideR", GUTTER_LEN, 0.002, GUTTER_D,
            rx, ry + GUTTER_W/2 - 0.001, th, COL_PVC)
        
        # LED Bar
        led_z = th + LED_OFFSET
        box(tier, "LED_Bar", GUTTER_LEN-0.10, 0.03, 0.015,
            rx, ry, led_z, COL_LED)
        
        # LED Light source
        led_light = UsdLux.RectLight.Define(stage, f"{tier}/LED_Light")
        led_light.AddTranslateOp().Set(Gf.Vec3d(rx, ry, led_z - 0.01))
        led_light.AddRotateXYZOp().Set(Gf.Vec3f(180, 0, 0))
        led_light.CreateWidthAttr(GUTTER_LEN - 0.10)
        led_light.CreateHeightAttr(0.03)
        led_light.CreateIntensityAttr(500)
        led_light.CreateColorAttr(Gf.Vec3f(1.0, 0.85, 0.95))
        
        # Plant site markers -> Strawberries
        for pi in range(PLANTS_PER_GUTTER):
            if PLANTS_PER_GUTTER > 1:
                px = -GUTTER_LEN/2 + 0.10 + pi * (GUTTER_LEN - 0.20) / max(1, PLANTS_PER_GUTTER - 1)
            else:
                px = 0
            
            # Plant crown (green)
            box(tier, f"Plant_{pi}_Crown", 0.06, 0.06, 0.02,
                rx + px, ry, th + 0.01, Gf.Vec3f(0.1, 0.4, 0.15))
            
            # 3 Berries per plant (with variation in ripeness)
            for side in [-1, 1]:
                for bi in range(3):
                    boff_y = side * (0.04 + bi * 0.01)
                    boff_z = th - 0.02 - bi * 0.015
                    
                    # Simulated ripeness based on position
                    if pi % 3 == 0 and bi == 2:
                        color = Gf.Vec3f(0.4, 0.8, 0.4) # Unripe green
                    else:
                        color = Gf.Vec3f(0.8, 0.1, 0.15) # Ripe red
                        
                    sphere(tier, f"Berry_{pi}_{side}_{bi}", 0.015,
                           rx + px + (bi*0.01), ry + boff_y, boff_z, color)
            
            total_plants += 1

print(f"  ✓ Racks: {RACK_COUNT} × {TIERS} tiers, {total_plants} plant sites")

# ═══════════════════════════════════════════════
# 7. BUILD: Climate (AC Unit)
# ═══════════════════════════════════════════════
ac = f"{farm}/AC_Unit"
UsdGeom.Xform.Define(stage, ac)
box(ac, "Body", 0.80, 0.22, 0.28, 0, -hd+0.12, H-0.40, COL_AC)
box(ac, "Vent", 0.60, 0.03, 0.08, 0, -hd+0.24, H-0.40, Gf.Vec3f(0.80, 0.82, 0.84))

print("  ✓ AC unit mounted")

# ═══════════════════════════════════════════════
# 7.5. BUILD: Robot (AMR + Franka Arm)
# ═══════════════════════════════════════════════
if HAS_ROBOT:
    robot_base_path = f"{farm}/AMR_Base"
    UsdGeom.Xform.Define(stage, robot_base_path)
    
    # AMR chassis
    box(robot_base_path, "Chassis", 0.60, 0.40, 0.25, 0, hd-0.60, 0.15, COL_ROBOT)
    
    try:
        from omni.isaac.franka import Franka
        print("  ✓ Loading built-in Franka robot asset...")
        franka = Franka(
            prim_path=f"{robot_base_path}/FrankaArm", 
            name="franka", 
            position=np.array([0, hd-0.60, 0.275])
        )
    except ImportError:
        print("  ⚠️ omni.isaac.franka not found, falling back to arm placeholder")
        box(robot_base_path, "ArmMount", 0.08, 0.08, 0.50, 0, hd-0.60, 0.50, COL_ROBOT)
        box(robot_base_path, "Gripper", 0.06, 0.04, 0.08, 0.15, hd-0.60, 0.70, Gf.Vec3f(0.60, 0.62, 0.65))

# ═══════════════════════════════════════════════
# 8. Lighting + Camera
# ═══════════════════════════════════════════════
# Ambient light
dome = UsdLux.DomeLight.Define(stage, f"{farm}/AmbientLight")
dome.CreateIntensityAttr(200)
dome.CreateColorAttr(Gf.Vec3f(0.95, 0.97, 1.0))

# Camera — positioned to see the whole room
cam_dist = max(W, D) * 1.5
cam = UsdGeom.Camera.Define(stage, f"{farm}/FarmCamera")
cam.AddTranslateOp().Set(Gf.Vec3d(cam_dist, -cam_dist, H * 0.8))
cam.AddRotateXYZOp().Set(Gf.Vec3f(60, 0, 45))
cam.CreateFocalLengthAttr(24)

print("  ✓ Lighting + camera")

# ═══════════════════════════════════════════════
# 9. Save USD
# ═══════════════════════════════════════════════
usd_filename = f"farmbase_{JOB_ID}.usd"
usd_path = os.path.join(OUTPUT_DIR, usd_filename)

stage.GetRootLayer().Export(usd_path)
print(f"\n💾 USD saved: {usd_path}")

# ═══════════════════════════════════════════════
# 10. Save build result metadata (for connector)
# ═══════════════════════════════════════════════
result_meta = {
    "job_id": JOB_ID,
    "status": "done",
    "usd_path": usd_path,
    "room": {"width": W, "depth": D, "height": H},
    "racks": RACK_COUNT,
    "tiers": TIERS,
    "total_plants": total_plants,
    "led_bars": RACK_COUNT * TIERS,
    "has_robot": HAS_ROBOT,
}

meta_path = os.path.join(OUTPUT_DIR, f"result_{JOB_ID}.json")
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(result_meta, f, indent=2)

print(f"📋 Metadata: {meta_path}")

# ═══════════════════════════════════════════════
# 11. Summary
# ═══════════════════════════════════════════════
print("\n" + "="*50)
print("🍓 Farmbase PFAL — Scene Complete!")
print("="*50)
print(f"   Room:    {W}m × {D}m × {H}m")
print(f"   Racks:   {RACK_COUNT} × {TIERS} tiers")
print(f"   Plants:  {total_plants} sites")
print(f"   LEDs:    {RACK_COUNT * TIERS} bars ({LED_WATTS}W each)")
print(f"   Robot:   {'✅ AMR Harvester' if HAS_ROBOT else '❌ disabled'}")
print(f"   Physics: Colliders on all surfaces")
print(f"   Output:  {usd_path}")
if crop_cfg.get("variety"):
    print(f"   Crop:    {crop_cfg['variety']} ({crop_cfg.get('variety_th', '')})")
print(f"\n📂 เปิด Isaac Sim GUI → File → Open → เลือก .usd")
print(f"   หรือ: isaac-sim.bat --open {usd_path}")
print("="*50)

# Cleanup
simulation_app.close()
