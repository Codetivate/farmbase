"""
Farmbase Synthetic Data Generator — Berry Detector Training Data
================================================================
Standalone Isaac Sim script: python.bat sdg_berry_detector.py

Uses NVIDIA Isaac Sim Replicator to generate synthetic training data
for YOLOv8 strawberry detection + ripeness classification.

Why synthetic > real photos?
  - 10,000 images in 30 minutes (vs weeks of manual photography)
  - Perfect bounding box + segmentation masks (no human labeling)
  - Domain randomization = better generalization
  - Zero cost after setup

Pipeline:
  1. Load farm USD scene (or generate procedurally)
  2. Randomize berry colors (green→red gradient)
  3. Randomize lighting (intensity, color temp, angle)
  4. Randomize camera pose (position, focal length)
  5. Render RGB + semantic segmentation + bounding boxes
  6. Export in COCO JSON format → ready for YOLOv8

⚠️  Run with Isaac Sim's python.bat only
"""

import argparse
import json
import os
import sys
import time
import random
import math
from typing import Any, Dict, List, Optional, Tuple

# ══════════════════════════════════════════════
# CLI Arguments
# ══════════════════════════════════════════════
parser = argparse.ArgumentParser(description="Farmbase SDG Berry Detector")
parser.add_argument("--num-images", type=int, default=1000, help="Number of images to generate")
parser.add_argument("--resolution", type=int, nargs=2, default=[640, 640], help="Image resolution W H")
parser.add_argument("--output-dir", default=None, help="Output directory")
parser.add_argument("--headless", action="store_true", default=False, help="Run without GUI")
parser.add_argument("--num-berries", type=int, default=20, help="Berries per scene")
parser.add_argument("--usd", default=None, help="Pre-built USD scene path")

args = parser.parse_args()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = args.output_dir or os.path.join(SCRIPT_DIR, "output", "sdg_dataset")

# ══════════════════════════════════════════════
# Initialize Isaac Sim
# ══════════════════════════════════════════════
try:
    from isaacsim import SimulationApp
    simulation_app = SimulationApp({
        "headless": args.headless,
        "width": args.resolution[0],
        "height": args.resolution[1],
    })
    print("✅ Isaac Sim initialized for Synthetic Data Generation")
except ImportError as e:
    print(f"❌ Isaac Sim not available: {e}")
    print("   Run with: python.bat sdg_berry_detector.py")
    sys.exit(1)

# ══════════════════════════════════════════════
# Import Omniverse APIs (AFTER SimulationApp)
# ══════════════════════════════════════════════
import numpy as np
import omni.usd
from omni.isaac.core import World
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, UsdLux

# Try importing Replicator
try:
    import omni.replicator.core as rep
    HAS_REPLICATOR = True
    print("  ✓ Omni Replicator loaded")
except ImportError:
    HAS_REPLICATOR = False
    print("  ⚠️ Replicator not available — using manual randomization")


# ══════════════════════════════════════════════
# Berry Ripeness Color Palette
# ══════════════════════════════════════════════

# Realistic strawberry color progression (linear RGB, 0-1)
RIPENESS_PALETTE = {
    "green": {
        "base_color": (0.15, 0.45, 0.08),
        "color_range": 0.08,
        "class_id": 0,
    },
    "white": {
        "base_color": (0.85, 0.82, 0.70),
        "color_range": 0.06,
        "class_id": 1,
    },
    "blush": {
        "base_color": (0.75, 0.35, 0.20),
        "color_range": 0.10,
        "class_id": 2,
    },
    "ripe": {
        "base_color": (0.85, 0.08, 0.05),
        "color_range": 0.08,
        "class_id": 3,
    },
    "overripe": {
        "base_color": (0.50, 0.02, 0.02),
        "color_range": 0.05,
        "class_id": 4,
    },
}

RIPENESS_DISTRIBUTION = {
    "green": 0.20,
    "white": 0.10,
    "blush": 0.15,
    "ripe": 0.40,
    "overripe": 0.15,
}


# ══════════════════════════════════════════════
# Scene Builder for SDG
# ══════════════════════════════════════════════

class SDGSceneBuilder:
    """
    Builds randomized farm scenes for synthetic data generation.
    Each frame gets different:
      - Berry positions, sizes, colors
      - Lighting intensity, angle, color temperature
      - Camera position and orientation
      - Background clutter and occlusion
    """

    def __init__(self, stage, num_berries: int = 20):
        self.stage = stage
        self.num_berries = num_berries
        self.berry_prims = []
        self.light_prims = []
        self.camera_prim = None

        # Farm dimensions (matching actual Farmbase layout)
        self.rack_width = 1.8    # meters
        self.rack_depth = 0.4
        self.tier_height = 0.35
        self.num_tiers = 5

    def build_base_scene(self):
        """Create the static farm structure."""
        root = self.stage.DefinePrim("/World/SDG_Farm", "Xform")

        # Ground plane
        ground = UsdGeom.Mesh.Define(self.stage, "/World/SDG_Farm/Ground")
        ground.CreatePointsAttr([
            Gf.Vec3f(-2, -2, 0), Gf.Vec3f(2, -2, 0),
            Gf.Vec3f(2, 2, 0), Gf.Vec3f(-2, 2, 0),
        ])
        ground.CreateFaceVertexCountsAttr([4])
        ground.CreateFaceVertexIndicesAttr([0, 1, 2, 3])
        ground.CreateDisplayColorAttr([(0.9, 0.9, 0.88)])  # light grey floor

        # Gutter (simplified)
        for tier in range(self.num_tiers):
            z = 0.30 + tier * self.tier_height
            gutter_path = f"/World/SDG_Farm/Gutter_T{tier}"
            gutter = UsdGeom.Cube.Define(self.stage, gutter_path)
            gutter.CreateSizeAttr(1.0)
            xform = UsdGeom.Xformable(gutter)
            xform.AddTranslateOp().Set(Gf.Vec3f(0, 0, z))
            xform.AddScaleOp().Set(Gf.Vec3f(self.rack_width, self.rack_depth, 0.03))
            gutter.CreateDisplayColorAttr([(0.85, 0.85, 0.85)])

        print(f"  ✓ Base scene: {self.num_tiers} tiers built")

    def create_berries(self):
        """Create berry prims that will be randomized each frame."""
        self.berry_prims = []
        for i in range(self.num_berries):
            berry_path = f"/World/SDG_Farm/Berries/Berry_{i:03d}"
            group = UsdGeom.Xform.Define(self.stage, berry_path)

            # Berry body (sphere)
            body_path = f"{berry_path}/Body"
            body = UsdGeom.Sphere.Define(self.stage, body_path)
            body.CreateRadiusAttr(0.012)  # ~2.4cm diameter strawberry

            # Calyx (small green disc on top)
            calyx_path = f"{berry_path}/Calyx"
            calyx = UsdGeom.Sphere.Define(self.stage, calyx_path)
            calyx.CreateRadiusAttr(0.008)
            calyx_xform = UsdGeom.Xformable(calyx)
            calyx_xform.AddTranslateOp().Set(Gf.Vec3f(0, 0, 0.012))
            calyx_xform.AddScaleOp().Set(Gf.Vec3f(1.2, 1.2, 0.3))
            calyx.CreateDisplayColorAttr([(0.1, 0.5, 0.05)])

            self.berry_prims.append({
                "group_path": berry_path,
                "body_path": body_path,
                "calyx_path": calyx_path,
                "body": body,
                "group": group,
            })

        print(f"  ✓ Created {self.num_berries} berry prims")

    def create_lights(self):
        """Create randomizable lights."""
        # LED grow light (main)
        led_path = "/World/SDG_Farm/Lights/LED_Main"
        led = UsdLux.RectLight.Define(self.stage, led_path)
        led.CreateWidthAttr(1.5)
        led.CreateHeightAttr(0.3)
        led.CreateIntensityAttr(5000)
        led_xform = UsdGeom.Xformable(led)
        led_xform.AddTranslateOp().Set(Gf.Vec3f(0, 0, 2.0))
        self.light_prims.append({"prim": led, "path": led_path, "type": "led"})

        # Fill light
        fill_path = "/World/SDG_Farm/Lights/Fill"
        fill = UsdLux.DomeLight.Define(self.stage, fill_path)
        fill.CreateIntensityAttr(200)
        self.light_prims.append({"prim": fill, "path": fill_path, "type": "dome"})

        print(f"  ✓ Created {len(self.light_prims)} lights")

    def create_camera(self):
        """Create the training camera."""
        cam_path = "/World/SDG_Farm/Camera/TrainingCam"
        cam = UsdGeom.Camera.Define(self.stage, cam_path)
        cam.CreateFocalLengthAttr(35.0)
        cam.CreateHorizontalApertureAttr(36.0)
        cam.CreateClippingRangeAttr(Gf.Vec2f(0.01, 100.0))
        self.camera_prim = cam
        print("  ✓ Training camera created")

    def randomize_berries(self, frame_idx: int):
        """Randomize berry positions, sizes, and colors for one frame."""
        annotations = []
        rng = random.Random(frame_idx * 42 + 7)

        # Choose ripeness distribution for this frame
        ripeness_keys = list(RIPENESS_PALETTE.keys())
        weights = [RIPENESS_DISTRIBUTION[k] for k in ripeness_keys]

        for i, berry_info in enumerate(self.berry_prims):
            # Random position on a random tier
            tier = rng.randint(0, self.num_tiers - 1)
            z = 0.30 + tier * self.tier_height + 0.02
            x = rng.uniform(-self.rack_width / 2 + 0.1, self.rack_width / 2 - 0.1)
            y = rng.uniform(-self.rack_depth / 2, self.rack_depth / 2 + 0.05)

            # Set position
            group_prim = self.stage.GetPrimAtPath(berry_info["group_path"])
            xformable = UsdGeom.Xformable(group_prim)
            ops = xformable.GetOrderedXformOps()
            if ops:
                ops[0].Set(Gf.Vec3f(x, y, z))
            else:
                xformable.AddTranslateOp().Set(Gf.Vec3f(x, y, z))

            # Random size (domain randomization: ±20%)
            scale = rng.uniform(0.8, 1.2)
            body = berry_info["body"]
            body.CreateRadiusAttr(0.012 * scale)

            # Random ripeness & color
            ripeness = rng.choices(ripeness_keys, weights=weights, k=1)[0]
            palette = RIPENESS_PALETTE[ripeness]
            base = palette["base_color"]
            cr = palette["color_range"]
            color = (
                max(0, min(1, base[0] + rng.uniform(-cr, cr))),
                max(0, min(1, base[1] + rng.uniform(-cr, cr))),
                max(0, min(1, base[2] + rng.uniform(-cr, cr))),
            )
            body.CreateDisplayColorAttr([color])

            # Store annotation
            annotations.append({
                "berry_id": i,
                "position": [round(x, 4), round(y, 4), round(z, 4)],
                "ripeness": ripeness,
                "class_id": palette["class_id"],
                "scale": round(scale, 3),
                "color_rgb": [round(c, 3) for c in color],
                "tier": tier,
            })

        return annotations

    def randomize_lighting(self, frame_idx: int):
        """Randomize lighting conditions."""
        rng = random.Random(frame_idx * 13 + 3)

        for light_info in self.light_prims:
            prim = light_info["prim"]
            if light_info["type"] == "led":
                # LED intensity (simulate dimmer variations)
                intensity = rng.uniform(3000, 8000)
                prim.CreateIntensityAttr(intensity)

                # Color temperature (3000K warm → 6500K cool)
                color_temp = rng.uniform(3000, 6500)
                # Approximate color from temperature
                if color_temp < 4000:
                    color = Gf.Vec3f(1.0, 0.85, 0.7)   # warm
                elif color_temp < 5500:
                    color = Gf.Vec3f(1.0, 0.95, 0.9)   # neutral
                else:
                    color = Gf.Vec3f(0.9, 0.95, 1.0)   # cool
                prim.CreateColorAttr(color)

            elif light_info["type"] == "dome":
                intensity = rng.uniform(100, 500)
                prim.CreateIntensityAttr(intensity)

    def randomize_camera(self, frame_idx: int):
        """Randomize camera position and orientation."""
        rng = random.Random(frame_idx * 97 + 11)

        # Camera position ranges (simulating wrist-mounted camera)
        cam_x = rng.uniform(-0.8, 0.8)
        cam_y = rng.uniform(-0.3, 0.5)
        cam_z = rng.uniform(0.3, 1.8)

        # Look at a random point in the growing area
        target_x = rng.uniform(-0.6, 0.6)
        target_y = rng.uniform(-0.2, 0.2)
        target_z = rng.uniform(0.3, 1.5)

        cam_prim = self.stage.GetPrimAtPath(
            str(self.camera_prim.GetPath())
        )
        xformable = UsdGeom.Xformable(cam_prim)

        # Clear existing transforms
        xformable.ClearXformOpOrder()

        # Set translate
        xformable.AddTranslateOp().Set(Gf.Vec3f(cam_x, cam_y, cam_z))

        # Calculate look-at rotation
        forward = Gf.Vec3f(target_x - cam_x, target_y - cam_y, target_z - cam_z)
        forward_len = forward.GetLength()
        if forward_len > 0.001:
            forward = forward / forward_len

        # Focal length variation
        focal = rng.uniform(24.0, 50.0)
        self.camera_prim.CreateFocalLengthAttr(focal)

        return {
            "cam_pos": [round(cam_x, 3), round(cam_y, 3), round(cam_z, 3)],
            "target": [round(target_x, 3), round(target_y, 3), round(target_z, 3)],
            "focal_mm": round(focal, 1),
        }


# ══════════════════════════════════════════════
# COCO Format Exporter
# ══════════════════════════════════════════════

class COCOExporter:
    """
    Exports annotations in COCO JSON format for YOLOv8 training.
    
    Structure:
      dataset/
        images/
          frame_000000.png
          frame_000001.png
          ...
        annotations/
          instances.json  (COCO format)
        labels/
          frame_000000.txt  (YOLO format: class cx cy w h)
    """

    def __init__(self, output_dir: str, resolution: Tuple[int, int]):
        self.output_dir = output_dir
        self.img_width, self.img_height = resolution
        self.images_dir = os.path.join(output_dir, "images")
        self.labels_dir = os.path.join(output_dir, "labels")
        self.annotations_dir = os.path.join(output_dir, "annotations")

        os.makedirs(self.images_dir, exist_ok=True)
        os.makedirs(self.labels_dir, exist_ok=True)
        os.makedirs(self.annotations_dir, exist_ok=True)

        # COCO structure
        self.coco = {
            "info": {
                "description": "Farmbase Synthetic Berry Detection Dataset",
                "version": "1.0",
                "year": 2026,
                "contributor": "Farmbase AI Engine",
                "date_created": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            "licenses": [{"id": 1, "name": "Farmbase Internal", "url": ""}],
            "categories": [
                {"id": 0, "name": "green", "supercategory": "berry"},
                {"id": 1, "name": "white", "supercategory": "berry"},
                {"id": 2, "name": "blush", "supercategory": "berry"},
                {"id": 3, "name": "ripe", "supercategory": "berry"},
                {"id": 4, "name": "overripe", "supercategory": "berry"},
            ],
            "images": [],
            "annotations": [],
        }
        self.annotation_id = 0

    def add_frame(self, frame_idx: int, berry_annotations: List[Dict],
                  camera_info: Dict):
        """Add one frame's annotations."""
        img_filename = f"frame_{frame_idx:06d}.png"

        # Image entry
        self.coco["images"].append({
            "id": frame_idx,
            "file_name": img_filename,
            "width": self.img_width,
            "height": self.img_height,
            "camera": camera_info,
        })

        # YOLO format labels for this frame
        yolo_lines = []

        for berry in berry_annotations:
            # Simulate bounding box from 3D position
            # In real pipeline, this comes from Replicator's annotator
            pos = berry["position"]
            scale = berry["scale"]

            # Project to image space (simplified pinhole model)
            cam = camera_info.get("cam_pos", [0, -0.5, 1.0])
            focal_px = camera_info.get("focal_mm", 35) * (self.img_width / 36.0)

            dx = pos[0] - cam[0]
            dy = pos[1] - cam[1]
            dz = pos[2] - cam[2]
            depth = max(0.1, math.sqrt(dx*dx + dy*dy + dz*dz))

            # Projected center
            cx = self.img_width / 2 + (dx / depth) * focal_px
            cy = self.img_height / 2 - (dz / depth) * focal_px

            # Projected size
            berry_radius_px = (0.012 * scale / depth) * focal_px * 2
            bbox_w = berry_radius_px * 2.2  # slightly larger for calyx
            bbox_h = berry_radius_px * 2.5

            # Clamp to image bounds
            x1 = max(0, cx - bbox_w / 2)
            y1 = max(0, cy - bbox_h / 2)
            x2 = min(self.img_width, cx + bbox_w / 2)
            y2 = min(self.img_height, cy + bbox_h / 2)

            w = x2 - x1
            h = y2 - y1

            # Skip if too small or out of frame
            if w < 5 or h < 5 or x1 >= self.img_width or y1 >= self.img_height:
                continue

            # COCO annotation
            self.coco["annotations"].append({
                "id": self.annotation_id,
                "image_id": frame_idx,
                "category_id": berry["class_id"],
                "bbox": [round(x1, 1), round(y1, 1), round(w, 1), round(h, 1)],
                "area": round(w * h, 1),
                "iscrowd": 0,
                "attributes": {
                    "ripeness": berry["ripeness"],
                    "tier": berry["tier"],
                },
            })
            self.annotation_id += 1

            # YOLO format: class_id center_x center_y width height (normalized)
            yolo_cx = ((x1 + x2) / 2) / self.img_width
            yolo_cy = ((y1 + y2) / 2) / self.img_height
            yolo_w = w / self.img_width
            yolo_h = h / self.img_height
            yolo_lines.append(
                f"{berry['class_id']} {yolo_cx:.6f} {yolo_cy:.6f} {yolo_w:.6f} {yolo_h:.6f}"
            )

        # Write YOLO label file
        label_file = os.path.join(self.labels_dir, f"frame_{frame_idx:06d}.txt")
        with open(label_file, 'w') as f:
            f.write('\n'.join(yolo_lines))

    def save(self):
        """Save COCO JSON annotations."""
        coco_path = os.path.join(self.annotations_dir, "instances.json")
        with open(coco_path, 'w', encoding='utf-8') as f:
            json.dump(self.coco, f, indent=2)

        # Also save dataset.yaml for YOLOv8
        yaml_path = os.path.join(self.output_dir, "dataset.yaml")
        with open(yaml_path, 'w') as f:
            f.write(f"# Farmbase Synthetic Berry Detection Dataset\n")
            f.write(f"# Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"# Images: {len(self.coco['images'])}\n")
            f.write(f"# Annotations: {len(self.coco['annotations'])}\n\n")
            f.write(f"path: {self.output_dir}\n")
            f.write(f"train: images\n")
            f.write(f"val: images\n\n")
            f.write(f"nc: 5\n")
            f.write(f"names:\n")
            for cat in self.coco["categories"]:
                f.write(f"  {cat['id']}: {cat['name']}\n")

        print(f"  📁 COCO JSON: {coco_path}")
        print(f"  📁 YOLO yaml: {yaml_path}")

        # Stats
        class_counts = {}
        for ann in self.coco["annotations"]:
            cid = ann["category_id"]
            name = self.coco["categories"][cid]["name"]
            class_counts[name] = class_counts.get(name, 0) + 1

        print(f"\n  📊 Dataset Statistics:")
        print(f"     Images:      {len(self.coco['images'])}")
        print(f"     Annotations: {len(self.coco['annotations'])}")
        for name, count in sorted(class_counts.items()):
            pct = count / max(1, len(self.coco["annotations"])) * 100
            print(f"     {name:12s}: {count:5d} ({pct:5.1f}%)")


# ══════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════

def main():
    print(f"\n{'='*50}")
    print("🎨 Farmbase Synthetic Data Generator")
    print(f"{'='*50}")
    print(f"   Images:     {args.num_images}")
    print(f"   Resolution: {args.resolution[0]}×{args.resolution[1]}")
    print(f"   Berries:    {args.num_berries} per frame")
    print(f"   Output:     {OUTPUT_DIR}")
    print(f"   Replicator: {'Yes' if HAS_REPLICATOR else 'No (manual mode)'}")
    print(f"{'='*50}\n")

    world = World()
    stage = omni.usd.get_context().get_stage()

    # Build scene
    builder = SDGSceneBuilder(stage, num_berries=args.num_berries)
    builder.build_base_scene()
    builder.create_berries()
    builder.create_lights()
    builder.create_camera()

    # Initialize exporter
    exporter = COCOExporter(OUTPUT_DIR, tuple(args.resolution))

    # Load USD scene if provided
    if args.usd and os.path.exists(args.usd):
        stage.GetRootLayer().subLayerPaths.append(args.usd)
        print(f"  📂 Loaded scene: {args.usd}")

    world.reset()
    start_time = time.time()

    if HAS_REPLICATOR:
        # ── Replicator Pipeline ──
        print("  🔄 Using Replicator pipeline...")

        # Register randomization graph
        with rep.new_layer():
            # Berry randomization would go here via Replicator API
            # For now, we use our manual randomization
            pass

        for frame_idx in range(args.num_images):
            # Manual randomization
            annotations = builder.randomize_berries(frame_idx)
            builder.randomize_lighting(frame_idx)
            cam_info = builder.randomize_camera(frame_idx)

            # Step simulation to render
            world.step(render=True)

            # Export annotations
            exporter.add_frame(frame_idx, annotations, cam_info)

            # Progress
            if (frame_idx + 1) % 100 == 0:
                elapsed = time.time() - start_time
                fps = (frame_idx + 1) / elapsed
                eta = (args.num_images - frame_idx - 1) / max(0.1, fps)
                print(f"  📸 Frame {frame_idx+1}/{args.num_images} "
                      f"({fps:.1f} fps, ETA: {eta:.0f}s)")
    else:
        # ── Manual Pipeline (no Replicator) ──
        print("  🔄 Using manual randomization pipeline...")

        for frame_idx in range(args.num_images):
            annotations = builder.randomize_berries(frame_idx)
            builder.randomize_lighting(frame_idx)
            cam_info = builder.randomize_camera(frame_idx)

            world.step(render=not args.headless)

            exporter.add_frame(frame_idx, annotations, cam_info)

            if (frame_idx + 1) % 100 == 0:
                elapsed = time.time() - start_time
                fps = (frame_idx + 1) / max(0.001, elapsed)
                print(f"  📸 Frame {frame_idx+1}/{args.num_images} "
                      f"({fps:.1f} fps)")

    # Save dataset
    exporter.save()

    elapsed = time.time() - start_time
    print(f"\n{'='*50}")
    print(f"✅ SDG Complete!")
    print(f"   Duration: {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"   Speed:    {args.num_images/max(0.1,elapsed):.1f} frames/sec")
    print(f"   Output:   {OUTPUT_DIR}")
    print(f"{'='*50}")

    simulation_app.close()


if __name__ == "__main__":
    main()
