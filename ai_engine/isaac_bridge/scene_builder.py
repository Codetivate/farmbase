"""
Farmbase Micro PFAL — Isaac Sim Scene Builder
================================================
วิธีใช้: Copy ทั้งหมด → Paste ใน Isaac Sim Script Editor → Ctrl+Enter

สร้างห้อง PFAL ขนาด 2m × 2m × 2.8m พร้อม:
  - พื้น Epoxy สีขาว + เพดาน
  - ผนัง PIR 4 ด้าน (มีช่องประตู)
  - ชั้นปลูก 1 rack × 3 tiers
  - ราง NFT gutter บนแต่ละ tier
  - LED bar เหนือ gutters
  - แอร์ split unit บนผนัง

อ้างอิง: Oishii, Plenty, Zordi (NVIDIA partner)
Research: Naphrom 2025, EB 2025, Whitaker 2025
"""

import omni.usd
from pxr import Usd, UsdGeom, UsdShade, UsdPhysics, Gf, Sdf, UsdLux

# ══════════════════════════════════════════════
# CONFIG — แก้ตรงนี้ได้เลย
# ══════════════════════════════════════════════
ROOM_W = 2.0    # meters
ROOM_D = 2.0
ROOM_H = 2.8
WALL_T = 0.05   # PIR insulation thickness

RACK_COUNT = 1
TIERS = 3
TIER_HEIGHTS = [0.40, 0.80, 1.20]  # meters from floor
GUTTER_LEN = 1.50
GUTTER_W = 0.10
GUTTER_D = 0.04

LED_BAR_H_OFFSET = 0.18  # LED bar above each tier

# ══════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════
stage = omni.usd.get_context().get_stage()

def clear_old_farm():
    """Remove previous farm prims if they exist."""
    farm_prim = stage.GetPrimAtPath("/World/Farm")
    if farm_prim.IsValid():
        stage.RemovePrim("/World/Farm")

def make_box(parent_path, name, size, pos, color=None):
    """Create a simple box (Cube scaled to size)."""
    path = f"{parent_path}/{name}"
    xform = UsdGeom.Xform.Define(stage, path)
    cube = UsdGeom.Cube.Define(stage, f"{path}/mesh")
    
    # Cube default size = 2 units, so scale = size/2
    cube.AddScaleOp().Set(Gf.Vec3f(size[0]/2, size[1]/2, size[2]/2))
    
    # Position the xform
    xform.AddTranslateOp().Set(Gf.Vec3d(pos[0], pos[1], pos[2]))
    
    # Color
    if color:
        cube.GetDisplayColorAttr().Set([Gf.Vec3f(*color)])
    
    return path

def make_thin_box(parent_path, name, sx, sy, sz, px, py, pz, color=None):
    """Shorthand for make_box with separate args."""
    return make_box(parent_path, name, [sx, sy, sz], [px, py, pz], color)

# ══════════════════════════════════════════════
# BUILD SCENE
# ══════════════════════════════════════════════
print("🌱 Farmbase: Building Micro PFAL scene...")
clear_old_farm()

# Root Xform
farm_root = UsdGeom.Xform.Define(stage, "/World/Farm")

# ── Colors ──
COL_FLOOR  = (0.92, 0.92, 0.90)  # White epoxy
COL_WALL   = (0.85, 0.87, 0.90)  # PIR panel light gray
COL_CEIL   = (0.95, 0.95, 0.95)  # White ceiling
COL_STEEL  = (0.70, 0.72, 0.74)  # Galvanized steel
COL_PVC    = (0.96, 0.96, 0.96)  # White PVC gutter
COL_LED_ON = (1.00, 0.95, 0.98)  # LED warm-pink glow
COL_AC     = (0.90, 0.90, 0.92)  # AC unit white
COL_DOOR   = (0.45, 0.47, 0.50)  # Door gray

W, D, H = ROOM_W, ROOM_D, ROOM_H
hw, hd = W/2, D/2

# ═══ FLOOR ═══
make_thin_box("/World/Farm", "Floor",
    W + 0.1, D + 0.1, 0.02,
    0, 0, -0.01,
    COL_FLOOR)

# ═══ CEILING ═══
make_thin_box("/World/Farm", "Ceiling",
    W + 0.1, D + 0.1, 0.02,
    0, 0, H,
    COL_CEIL)

# ═══ WALLS ═══
walls = "/World/Farm/Walls"
UsdGeom.Xform.Define(stage, walls)

# Back wall (Y-)
make_thin_box(walls, "WallBack",
    W, WALL_T, H,
    0, -hd, H/2,
    COL_WALL)

# Front wall (Y+) — with door gap
# Left portion
make_thin_box(walls, "WallFrontL",
    (W - 0.9) / 2, WALL_T, H,
    -(W/2 - (W-0.9)/4), hd, H/2,
    COL_WALL)
# Right portion
make_thin_box(walls, "WallFrontR",
    (W - 0.9) / 2, WALL_T, H,
    (W/2 - (W-0.9)/4), hd, H/2,
    COL_WALL)
# Above door
make_thin_box(walls, "WallFrontTop",
    0.9, WALL_T, H - 2.1,
    0, hd, 2.1 + (H - 2.1)/2,
    COL_WALL)
# Door
make_thin_box(walls, "Door",
    0.85, 0.04, 2.05,
    0, hd + 0.01, 2.05/2,
    COL_DOOR)

# Left wall (X-)
make_thin_box(walls, "WallLeft",
    WALL_T, D, H,
    -hw, 0, H/2,
    COL_WALL)

# Right wall (X+)
make_thin_box(walls, "WallRight",
    WALL_T, D, H,
    hw, 0, H/2,
    COL_WALL)

# ═══ RACKS ═══
racks_root = "/World/Farm/Racks"
UsdGeom.Xform.Define(stage, racks_root)

for ri in range(RACK_COUNT):
    rack_path = f"{racks_root}/Rack_{ri}"
    UsdGeom.Xform.Define(stage, rack_path)
    
    # Rack X position (centered for 1 rack)
    rx = 0.0
    ry = 0.0
    
    # 4 Posts (steel angle)
    post_positions = [
        (-GUTTER_LEN/2 + 0.05, -0.05),
        (-GUTTER_LEN/2 + 0.05,  0.05),
        ( GUTTER_LEN/2 - 0.05, -0.05),
        ( GUTTER_LEN/2 - 0.05,  0.05),
    ]
    for pi, (px, py) in enumerate(post_positions):
        make_thin_box(rack_path, f"Post_{pi}",
            0.025, 0.025, TIER_HEIGHTS[-1] + 0.30,
            rx + px, ry + py, (TIER_HEIGHTS[-1] + 0.30) / 2,
            COL_STEEL)
    
    # Tiers: gutter + LED bar
    for ti, th in enumerate(TIER_HEIGHTS):
        tier_path = f"{rack_path}/Tier_{ti}"
        UsdGeom.Xform.Define(stage, tier_path)
        
        # NFT Gutter (PVC)
        make_thin_box(tier_path, "Gutter",
            GUTTER_LEN, GUTTER_W, GUTTER_D,
            rx, ry, th,
            COL_PVC)
        
        # Gutter walls (sides of the channel)
        for side in [-1, 1]:
            make_thin_box(tier_path, f"GutterSide_{'+' if side > 0 else '-'}",
                GUTTER_LEN, 0.002, GUTTER_D,
                rx, ry + side * GUTTER_W / 2, th,
                COL_PVC)
        
        # LED bar above gutter
        led_z = th + LED_BAR_H_OFFSET
        make_thin_box(tier_path, "LED_Bar",
            GUTTER_LEN - 0.10, 0.03, 0.015,
            rx, ry, led_z,
            COL_LED_ON)
        
        # LED light source (actual light)
        led_light_path = f"{tier_path}/LED_Light"
        led_light = UsdLux.RectLight.Define(stage, led_light_path)
        led_light.AddTranslateOp().Set(Gf.Vec3d(rx, ry, led_z - 0.01))
        led_light.AddRotateXYZOp().Set(Gf.Vec3f(180, 0, 0))  # Point downward
        led_light.CreateWidthAttr(GUTTER_LEN - 0.10)
        led_light.CreateHeightAttr(0.03)
        led_light.CreateIntensityAttr(500)
        led_light.CreateColorAttr(Gf.Vec3f(1.0, 0.85, 0.95))  # Grow light pink-ish

# ═══ CLIMATE: AC Unit ═══
ac_path = "/World/Farm/AC_Unit"
UsdGeom.Xform.Define(stage, ac_path)
make_thin_box(ac_path, "Body",
    0.80, 0.22, 0.28,
    0, -hd + 0.12, H - 0.40,
    COL_AC)
make_thin_box(ac_path, "Vent",
    0.60, 0.03, 0.08,
    0, -hd + 0.24, H - 0.40,
    (0.80, 0.82, 0.84))

# ═══ ROOM LIGHT (ambient) ═══
room_light_path = "/World/Farm/RoomLight"
room_light = UsdLux.DomeLight.Define(stage, room_light_path)
room_light.CreateIntensityAttr(200)
room_light.CreateColorAttr(Gf.Vec3f(0.95, 0.97, 1.0))

# ═══ PHYSICS ═══
# Add rigid body + collider to floor
floor_prim = stage.GetPrimAtPath("/World/Farm/Floor/mesh")
if floor_prim.IsValid():
    UsdPhysics.CollisionAPI.Apply(floor_prim)

# ═══ CAMERA ═══
cam_path = "/World/Farm/FarmCamera"
cam = UsdGeom.Camera.Define(stage, cam_path)
cam.AddTranslateOp().Set(Gf.Vec3d(2.5, -2.5, 2.0))
cam.AddRotateXYZOp().Set(Gf.Vec3f(60, 0, 45))
cam.CreateFocalLengthAttr(24)

# ═══ DONE ═══
print("✅ Farmbase Micro PFAL scene created!")
print(f"   Room: {W}m × {D}m × {H}m")
print(f"   Racks: {RACK_COUNT} × {TIERS} tiers")
print(f"   Gutters: {GUTTER_LEN}m NFT")
print(f"   LEDs: {RACK_COUNT * TIERS} bars (Samsung LM301H)")
print(f"   Plants: {RACK_COUNT * TIERS * 7} sites")
print("🍓 Ready for next step: Add strawberry plants + robot")
