import os

filename = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm.py"

with open(filename, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update IMPORTS
code = code.replace("import omni.usd\nimport omni.kit.commands", 
                   "import omni.usd\nimport omni.kit.commands\nimport omni.replicator.core as rep\nfrom pxr import Semantics")

# 2. Add Semantic Tags to BERRY creation
old_berry_ripe = """                    VisualSphere(f"/World/Racks/{side}/By_T{t}_P{pi}",
                                 name=f"by_{side}_t{t}_{pi}",
                                 position=np.array([berry_x, py, berry_z]),
                                 radius=0.020, color=BERRY_RED)"""

new_berry_ripe = """                    berry_prim = VisualSphere(f"/World/Racks/{side}/By_T{t}_P{pi}",
                                 name=f"by_{side}_t{t}_{pi}",
                                 position=np.array([berry_x, py, berry_z]),
                                 radius=0.020, color=BERRY_RED).prim
                    semAPI = Semantics.SemanticsAPI.Apply(berry_prim, "Semantics")
                    semAPI.CreateSemanticTypeAttr()
                    semAPI.CreateSemanticDataAttr()
                    semAPI.GetSemanticTypeAttr().Set("class")
                    semAPI.GetSemanticDataAttr().Set("strawberry_ripe")"""

code = code.replace(old_berry_ripe, new_berry_ripe)

old_berry_unripe = """                    VisualSphere(f"/World/Racks/{side}/By_T{t}_P{pi}",
                                 name=f"by_{side}_t{t}_{pi}",
                                 position=np.array([berry_x, py, berry_z + 0.02]),
                                 radius=0.013, color=BERRY_WHITE)"""

new_berry_unripe = """                    berry_prim = VisualSphere(f"/World/Racks/{side}/By_T{t}_P{pi}",
                                 name=f"by_{side}_t{t}_{pi}",
                                 position=np.array([berry_x, py, berry_z + 0.02]),
                                 radius=0.013, color=BERRY_WHITE).prim
                    semAPI = Semantics.SemanticsAPI.Apply(berry_prim, "Semantics")
                    semAPI.CreateSemanticTypeAttr()
                    semAPI.CreateSemanticDataAttr()
                    semAPI.GetSemanticTypeAttr().Set("class")
                    semAPI.GetSemanticDataAttr().Set("strawberry_unripe")"""

code = code.replace(old_berry_unripe, new_berry_unripe)

# 3. Replace Section 9b with 9c
# Searching indices
idx_start = code.find("# 9b. NVIDIA OFFICIAL ROBOT ASSET")
idx_end = code.find("# 10. CROWN-COOLING SYSTEM")

if idx_start != -1 and idx_end != -1:
    section_9b = code[idx_start:idx_end]
    gantry_code = """# 9c. OVERHEAD XYZ GANTRY & HARVESTER (Phase 2)
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
    """
    code = code[:idx_start] + gantry_code + code[idx_end:]


# 4. Add Replicator inside stats / end of program
rep_code = """
    # ═══════════════════════════════════════════════════════════
    # 13. REPLICATOR: SYNTHETIC AI DATA LABELING (Phase 1 Harvester)
    # ═══════════════════════════════════════════════════════════
    print("🧠 [LOD 400] Initializing Replicator Synthetic Dataset Generation...")
    # Attach RTX Camera to Gantry
    camera = rep.create.camera(position=(0, -0.3, 1.5), look_at=(0.8, 0, 1.0))
    render_product = rep.create.render_product(camera, (1024, 1024))
    
    # Config Writer
    writer = rep.WriterRegistry.get("BasicWriter")
    writer.initialize(
        output_dir="C:/Users/nesnk/Desktop/Farmbase/farmbase/_output/strawberry_dataset",
        rgb=True, bounding_box_2d_tight=True, semantic_segmentation=True
    )
    writer.attach([render_product])
    
    # Randomize strawberry placement slightly to create robust dataset
    with rep.trigger.on_frame(num_frames=10):
        with rep.get.prims(path_pattern="/World/Racks/.*/By_T.*"):
            rep.modify.pose(
                # Slight wobble translation/rotation
                position=rep.distribution.uniform((-0.01, -0.01, -0.01), (0.01, 0.01, 0.01)),
                rotation=rep.distribution.uniform((-15, -15, -15), (15, 15, 15))
            )
    print("   ✓ Writer attached. BoundingBoxes & Semantics will be saved to _output/strawberry_dataset")
"""

idx_stats = code.find("    print(\"\\n\" + \"=\"*65)")
if idx_stats != -1:
    code = code[:idx_stats] + rep_code + code[idx_stats:]


# 5. Fix Title text
code = code.replace("Farmbase 3D Architectural Builder v4.0", "Farmbase 3D Architectural Builder v5.0")
code = code.replace("FARMBASE LOD 400 v4.0 — RESEARCH-VALIDATED BUILD COMPLETE", "FARMBASE V5.0 — XYZ GANTRY & AI REPLICATOR COMPLETE")
code = code.replace("Robot:        Franka Panda (NVIDIA USD Asset)", "Robot:        Overhead XYZ Gantry + Intel RealSense Vision")

with open(filename, "w", encoding="utf-8") as f:
    f.write(code)

print("Patching complete!")
