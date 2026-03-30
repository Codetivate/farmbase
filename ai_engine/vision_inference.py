"""
Farmbase Vision Inference — Berry Detection & Ripeness Classification
=====================================================================
Lightweight inference module using ONNX Runtime.
Designed to run on both desktop GPU and edge devices (Jetson).

Pipeline:
  Camera frame → Preprocess → YOLOv8 detect → NMS → Ripeness classify → Results

Classes:
  0: green     → ❌ Do not pick
  1: white     → ❌ Do not pick  
  2: blush     → ⏳ Almost ready
  3: ripe      → ✅ PICK NOW
  4: overripe  → ⚠️ Pick urgently

This module is the "eyes" of the Cortex Harvester.
It receives camera frames and returns berry detections
that drive the behavior tree decisions.
"""

import json
import math
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Inference flags
HAS_ONNX = False
HAS_ULTRALYTICS = False

# Defer imports of heavy libraries to avoid hanging the script on initialization
# when only using the simulated backend.


# ══════════════════════════════════════════════
# Data Structures
# ══════════════════════════════════════════════

RIPENESS_CLASSES = {
    0: {"name": "green",    "harvestable": False, "color": (0, 180, 0),    "priority": 0.0},
    1: {"name": "white",    "harvestable": False, "color": (220, 210, 180), "priority": 0.1},
    2: {"name": "blush",    "harvestable": False, "color": (200, 100, 50),  "priority": 0.3},
    3: {"name": "ripe",     "harvestable": True,  "color": (220, 20, 20),   "priority": 1.0},
    4: {"name": "overripe", "harvestable": True,  "color": (130, 10, 10),   "priority": 0.8},
}


@dataclass
class BerryDetection:
    """A single detected berry in an image."""
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    class_id: int
    confidence: float
    ripeness: str = ""
    harvestable: bool = False
    priority: float = 0.0
    center_px: Tuple[float, float] = (0.0, 0.0)
    area_px: float = 0.0
    estimated_3d_pos: Optional[np.ndarray] = None

    def __post_init__(self):
        info = RIPENESS_CLASSES.get(self.class_id, RIPENESS_CLASSES[0])
        self.ripeness = info["name"]
        self.harvestable = info["harvestable"]
        self.priority = info["priority"] * self.confidence
        x1, y1, x2, y2 = self.bbox
        self.center_px = ((x1 + x2) / 2, (y1 + y2) / 2)
        self.area_px = (x2 - x1) * (y2 - y1)

    def to_dict(self) -> dict:
        return {
            "bbox": [round(v, 1) for v in self.bbox],
            "class_id": self.class_id,
            "ripeness": self.ripeness,
            "confidence": round(self.confidence, 3),
            "harvestable": self.harvestable,
            "priority": round(self.priority, 3),
            "center_px": [round(v, 1) for v in self.center_px],
            "area_px": round(self.area_px, 1),
        }


@dataclass
class FrameResult:
    """Complete detection result for one frame."""
    timestamp: float
    frame_id: int
    detections: List[BerryDetection] = field(default_factory=list)
    inference_ms: float = 0.0
    image_size: Tuple[int, int] = (640, 640)

    @property
    def total_berries(self) -> int:
        return len(self.detections)

    @property
    def harvestable_berries(self) -> List[BerryDetection]:
        return sorted(
            [d for d in self.detections if d.harvestable],
            key=lambda d: d.priority,
            reverse=True,
        )

    @property
    def ripeness_distribution(self) -> Dict[str, int]:
        dist = {}
        for d in self.detections:
            dist[d.ripeness] = dist.get(d.ripeness, 0) + 1
        return dist

    @property
    def best_target(self) -> Optional[BerryDetection]:
        harvestable = self.harvestable_berries
        return harvestable[0] if harvestable else None

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "frame_id": self.frame_id,
            "total_berries": self.total_berries,
            "harvestable_count": len(self.harvestable_berries),
            "ripeness_distribution": self.ripeness_distribution,
            "inference_ms": round(self.inference_ms, 1),
            "best_target": self.best_target.to_dict() if self.best_target else None,
            "detections": [d.to_dict() for d in self.detections],
        }


# ══════════════════════════════════════════════
# Vision Inference Engine
# ══════════════════════════════════════════════

class VisionInference:
    """
    Berry detection + ripeness classification engine.
    
    Supports three backends:
    1. ONNX Runtime — fastest, works on Jetson
    2. Ultralytics YOLO — easiest to use  
    3. Simulated — for testing without model
    
    Usage:
        vision = VisionInference()
        vision.load_model("best.onnx")
        result = vision.detect(camera_frame)
        target = result.best_target
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        confidence_threshold: float = 0.5,
        nms_threshold: float = 0.45,
        input_size: Tuple[int, int] = (640, 640),
        device: str = "auto",
    ):
        self.model_path = model_path
        self.conf_thresh = confidence_threshold
        self.nms_thresh = nms_threshold
        self.input_size = input_size
        self.device = device

        self.model = None
        self.session = None
        self.backend = "simulated"
        self.frame_count = 0
        self.total_inference_ms = 0.0

        # Camera intrinsics (Intel RealSense D435 defaults)
        self.camera_matrix = np.array([
            [615.0, 0,     320.0],
            [0,     615.0, 240.0],
            [0,     0,     1.0],
        ])

        if model_path:
            self.load_model(model_path)

    def load_model(self, model_path: str):
        """Load detection model from file."""
        if not os.path.exists(model_path):
            print(f"  ⚠️ Model not found: {model_path}, using simulated detection")
            self.backend = "simulated"
            return

        ext = os.path.splitext(model_path)[1].lower()

        if ext == ".onnx" and HAS_ONNX:
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            if self.device == "cpu":
                providers = ['CPUExecutionProvider']
            
            self.session = ort.InferenceSession(model_path, providers=providers)
            self.backend = "onnx"
            provider_used = self.session.get_providers()[0]
            print(f"  ✓ ONNX model loaded: {model_path} ({provider_used})")

        elif ext == ".pt" and HAS_ULTRALYTICS:
            self.model = YOLO(model_path)
            self.backend = "ultralytics"
            print(f"  ✓ YOLOv8 model loaded: {model_path}")

        else:
            print(f"  ⚠️ Unsupported model format: {ext}, using simulated")
            self.backend = "simulated"

    def detect(self, frame: np.ndarray, depth_frame: Optional[np.ndarray] = None) -> FrameResult:
        """
        Run detection on a camera frame.
        
        Args:
            frame: RGB image as numpy array (H, W, 3) uint8
            depth_frame: Optional depth map (H, W) float32 in meters
        
        Returns:
            FrameResult with all detections
        """
        self.frame_count += 1
        start = time.time()

        if self.backend == "onnx":
            detections = self._detect_onnx(frame)
        elif self.backend == "ultralytics":
            detections = self._detect_ultralytics(frame)
        else:
            detections = self._detect_simulated(frame)

        inference_ms = (time.time() - start) * 1000
        self.total_inference_ms += inference_ms

        # Estimate 3D positions if depth available
        if depth_frame is not None:
            for det in detections:
                det.estimated_3d_pos = self._pixel_to_3d(
                    det.center_px, depth_frame
                )

        result = FrameResult(
            timestamp=time.time(),
            frame_id=self.frame_count,
            detections=detections,
            inference_ms=inference_ms,
            image_size=(frame.shape[1], frame.shape[0]) if frame is not None else self.input_size,
        )

        return result

    # ── Backend Implementations ──

    def _detect_onnx(self, frame: np.ndarray) -> List[BerryDetection]:
        """ONNX Runtime inference."""
        detections = []

        # Preprocess
        img = self._preprocess(frame)

        # Run inference
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: img})

        # Parse YOLOv8 output format
        # Output shape: (1, num_classes + 4, num_predictions)
        output = outputs[0]
        if output.ndim == 3:
            output = output[0].T  # (num_pred, num_classes + 4)

        for pred in output:
            x_center, y_center, w, h = pred[:4]
            class_scores = pred[4:]
            class_id = int(np.argmax(class_scores))
            confidence = float(class_scores[class_id])

            if confidence < self.conf_thresh:
                continue
            if class_id not in RIPENESS_CLASSES:
                continue

            # Convert to image coordinates
            scale_x = frame.shape[1] / self.input_size[0]
            scale_y = frame.shape[0] / self.input_size[1]

            x1 = (x_center - w / 2) * scale_x
            y1 = (y_center - h / 2) * scale_y
            x2 = (x_center + w / 2) * scale_x
            y2 = (y_center + h / 2) * scale_y

            detections.append(BerryDetection(
                bbox=(x1, y1, x2, y2),
                class_id=class_id,
                confidence=confidence,
            ))

        # Apply NMS
        detections = self._nms(detections)
        return detections

    def _detect_ultralytics(self, frame: np.ndarray) -> List[BerryDetection]:
        """Ultralytics YOLOv8 inference."""
        results = self.model(frame, conf=self.conf_thresh, iou=self.nms_thresh,
                             verbose=False)
        detections = []

        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])

                if class_id in RIPENESS_CLASSES:
                    detections.append(BerryDetection(
                        bbox=(float(x1), float(y1), float(x2), float(y2)),
                        class_id=class_id,
                        confidence=confidence,
                    ))

        return detections

    def _detect_simulated(self, frame: np.ndarray) -> List[BerryDetection]:
        """
        Simulated detection for testing without a trained model.
        Generates realistic-looking detections based on frame statistics.
        """
        detections = []
        rng = np.random.RandomState(self.frame_count)

        if frame is not None:
            h, w = frame.shape[:2]
        else:
            w, h = self.input_size

        # Generate 5-15 simulated berries
        num_berries = rng.randint(5, 16)

        for i in range(num_berries):
            # Random position
            cx = rng.uniform(w * 0.1, w * 0.9)
            cy = rng.uniform(h * 0.1, h * 0.9)
            bw = rng.uniform(20, 60)
            bh = rng.uniform(25, 70)

            # Random class with realistic distribution
            class_weights = [0.20, 0.10, 0.15, 0.40, 0.15]
            class_id = rng.choice(5, p=class_weights)
            confidence = rng.uniform(0.6, 0.98)

            if frame is not None:
                # Use actual pixel colors to infer ripeness
                px, py = int(cx), int(cy)
                px = min(px, w - 1)
                py = min(py, h - 1)
                pixel = frame[py, px]
                r, g, b = pixel[0], pixel[1], pixel[2]

                # Color-based heuristic
                if r > 150 and g < 80:
                    class_id = 3  # ripe (red)
                elif r > 120 and g > 80:
                    class_id = 2  # blush
                elif g > 120:
                    class_id = 0  # green

            detections.append(BerryDetection(
                bbox=(cx - bw/2, cy - bh/2, cx + bw/2, cy + bh/2),
                class_id=class_id,
                confidence=confidence,
            ))

        return detections

    # ── Utilities ──

    def _preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for ONNX inference."""
        # Resize
        try:
            import cv2
            img = cv2.resize(frame, self.input_size)
        except ImportError:
            # Manual resize using numpy (rough)
            h, w = frame.shape[:2]
            th, tw = self.input_size[1], self.input_size[0]
            img = frame[::max(1, h//th), ::max(1, w//tw)][:th, :tw]

        # Normalize and transpose: HWC → CHW
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, 0)  # add batch dimension
        return img

    def _nms(self, detections: List[BerryDetection]) -> List[BerryDetection]:
        """Non-Maximum Suppression."""
        if not detections:
            return []

        # Sort by confidence descending
        detections.sort(key=lambda d: d.confidence, reverse=True)

        keep = []
        for det in detections:
            # Check IoU with already kept detections
            should_keep = True
            for kept in keep:
                iou = self._compute_iou(det.bbox, kept.bbox)
                if iou > self.nms_thresh:
                    should_keep = False
                    break
            if should_keep:
                keep.append(det)

        return keep

    @staticmethod
    def _compute_iou(box1: Tuple, box2: Tuple) -> float:
        """Compute Intersection over Union."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        union = area1 + area2 - intersection

        return intersection / max(union, 1e-6)

    def _pixel_to_3d(self, pixel: Tuple[float, float],
                     depth_frame: np.ndarray) -> np.ndarray:
        """
        Convert pixel coordinate + depth to 3D world coordinate.
        Uses camera intrinsics (pinhole model).
        """
        u, v = int(pixel[0]), int(pixel[1])
        h, w = depth_frame.shape[:2]
        u = max(0, min(w - 1, u))
        v = max(0, min(h - 1, v))

        depth = depth_frame[v, u]
        if depth <= 0:
            return np.array([0, 0, 0])

        fx = self.camera_matrix[0, 0]
        fy = self.camera_matrix[1, 1]
        cx = self.camera_matrix[0, 2]
        cy = self.camera_matrix[1, 2]

        x = (u - cx) * depth / fx
        y = (v - cy) * depth / fy
        z = depth

        return np.array([x, y, z])

    def get_stats(self) -> Dict[str, Any]:
        """Get inference statistics."""
        avg_ms = self.total_inference_ms / max(1, self.frame_count)
        return {
            "backend": self.backend,
            "frames_processed": self.frame_count,
            "avg_inference_ms": round(avg_ms, 1),
            "avg_fps": round(1000 / max(0.1, avg_ms), 1),
            "model_path": self.model_path,
        }


# ══════════════════════════════════════════════
# Standalone Test
# ══════════════════════════════════════════════

if __name__ == "__main__":
    print("👁️ Farmbase Vision Inference — Standalone Test")
    print("=" * 50)

    vision = VisionInference(confidence_threshold=0.5)
    print(f"   Backend: {vision.backend}")
    print(f"   ONNX available: {HAS_ONNX}")
    print(f"   Ultralytics available: {HAS_ULTRALYTICS}")

    # Simulated test with random frames
    for i in range(10):
        # Create a random test frame
        frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

        # Add some "berry-like" colored patches
        for _ in range(8):
            cx, cy = np.random.randint(50, 590), np.random.randint(50, 430)
            r = np.random.randint(10, 30)
            # Red berry patch
            if np.random.random() > 0.5:
                frame[cy-r:cy+r, cx-r:cx+r] = [200, 30, 20]  # ripe
            else:
                frame[cy-r:cy+r, cx-r:cx+r] = [30, 150, 20]  # green

        result = vision.detect(frame)

        if i % 3 == 0:
            print(f"\n  Frame {result.frame_id}:")
            print(f"    Total: {result.total_berries}")
            print(f"    Harvestable: {len(result.harvestable_berries)}")
            print(f"    Distribution: {result.ripeness_distribution}")
            print(f"    Inference: {result.inference_ms:.1f}ms")
            if result.best_target:
                t = result.best_target
                print(f"    Best target: {t.ripeness} (conf: {t.confidence:.2f}) at {t.center_px}")

    stats = vision.get_stats()
    print(f"\n  📊 Stats: {stats['avg_fps']:.0f} FPS avg ({stats['backend']})")
    print("=" * 50)
