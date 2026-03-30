"""
Isaac Bridge — NVIDIA Isaac Sim Integration for Farmbase
=========================================================
Connects Farmbase's farm configuration to NVIDIA Isaac Sim
for physics-accurate simulation, RL training, and digital twin.

Modules:
  - scene_builder:  Generate USD farm scene from config
  - materials:      PBR materials for farm components
  - robot_loader:   Import URDF robot into Isaac Sim
  - plant_spawner:  Spawn strawberry meshes with ripeness
  - sensor_config:  RGB-D camera + LiDAR setup
  - training_env:   Isaac Lab RL environment
  - ros2_bridge:    ROS2 communication bridge

Usage (standalone):
  isaac_sim_python.sh -m isaac_bridge.scene_builder

Role Model: Zordi (NVIDIA partner) — indoor farm digital twin
Research: Oishii, Plenty, Dogtooth Gen5, Xiong 2024 (YOLOv8)
"""

__version__ = "0.1.0"
__isaac_sim_min_version__ = "4.0.0"
