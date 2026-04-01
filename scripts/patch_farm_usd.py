import os

filename = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm.py"

with open(filename, "r", encoding="utf-8") as f:
    code = f.read()

# Make sure assets directory exists
assets_dir = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\assets"
os.makedirs(assets_dir, exist_ok=True)

# 1. Provide the exact string we injected for RIPE strawberries in the previous patch
old_berry_ripe = """                    berry_prim = VisualSphere(f"/World/Racks/{side}/By_T{t}_P{pi}",
                                 name=f"by_{side}_t{t}_{pi}",
                                 position=np.array([berry_x, py, berry_z]),
                                 radius=0.020, color=BERRY_RED).prim
                    semAPI = Semantics.SemanticsAPI.Apply(berry_prim, "Semantics")
                    semAPI.CreateSemanticTypeAttr()
                    semAPI.CreateSemanticDataAttr()
                    semAPI.GetSemanticTypeAttr().Set("class")
                    semAPI.GetSemanticDataAttr().Set("strawberry_ripe")"""

new_berry_ripe = """                    prim_path = f"/World/Racks/{side}/By_T{t}_P{pi}"
                    usd_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "strawberry.usd")
                    # Fallback to absolute if needed
                    # usd_path = r"c:\\Users\\nesnk\\Desktop\\Farmbase\\farmbase\\ai_engine\\assets\\strawberry.usd"
                    
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
                    semAPI.CreateSemanticDataAttr().Set("strawberry_ripe")"""

# 2. Provide the exact string for UNRIPE strawberries
old_berry_unripe = """                    berry_prim = VisualSphere(f"/World/Racks/{side}/By_T{t}_P{pi}",
                                 name=f"by_{side}_t{t}_{pi}",
                                 position=np.array([berry_x, py, berry_z + 0.02]),
                                 radius=0.013, color=BERRY_WHITE).prim
                    semAPI = Semantics.SemanticsAPI.Apply(berry_prim, "Semantics")
                    semAPI.CreateSemanticTypeAttr()
                    semAPI.CreateSemanticDataAttr()
                    semAPI.GetSemanticTypeAttr().Set("class")
                    semAPI.GetSemanticDataAttr().Set("strawberry_unripe")"""

new_berry_unripe = """                    prim_path = f"/World/Racks/{side}/By_T{t}_P{pi}"
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
                    semAPI.CreateSemanticDataAttr().Set("strawberry_unripe")"""

code = code.replace(old_berry_ripe, new_berry_ripe)
code = code.replace(old_berry_unripe, new_berry_unripe)

# 3. Update Title text
code = code.replace("FARMBASE V5.0 — XYZ GANTRY & AI REPLICATOR COMPLETE", "FARMBASE V5.1 — REALISTIC USD STRAWBERRY GANTRY & AI REPLICATOR")

with open(filename, "w", encoding="utf-8") as f:
    f.write(code)

print("Patching complete! V5.1 generated.")
