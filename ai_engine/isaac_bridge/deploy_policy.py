"""
Farmbase Deploy Policy — Export & Deploy Trained Harvesting Policy
==================================================================
Takes a trained RL policy and deploys it:
  1. Convert to ONNX format for fast inference
  2. Validate in Isaac Sim (headless simulation)
  3. Generate deployment package for physical robot (future)

Usage:
  python deploy_policy.py --policy harvest_policy.json --validate
  python deploy_policy.py --policy harvest_policy.json --export-onnx
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, Optional, Tuple

import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


class PolicyRunner:
    """
    Loads and executes a trained harvesting policy.
    
    Supports:
    - JSON format (from SimpleRLTrainer)
    - ONNX format (for production deployment)
    - NumPy simulation (for validation)
    """
    
    def __init__(self, policy_path: str):
        self.policy_path = policy_path
        self.policy_data = None
        self.w1 = None
        self.b1 = None
        self.w2 = None
        self.b2 = None
        self.config = {}
        self.geometry = {}
        
        self._load(policy_path)
    
    def _load(self, path: str):
        """Load policy from file."""
        ext = os.path.splitext(path)[1].lower()
        
        if ext == ".json":
            with open(path, 'r') as f:
                data = json.load(f)
            
            self.w1 = np.array(data["w1"])
            self.b1 = np.array(data["b1"])
            self.w2 = np.array(data["w2"])
            self.b2 = np.array(data["b2"])
            self.config = data.get("config", {})
            self.geometry = data.get("geometry", {})
            self.policy_data = data
            
            print(f"  ✓ Policy loaded: {path}")
            print(f"    Obs dim: {self.config.get('obs_dim', '?')}")
            print(f"    Action dim: {self.config.get('action_dim', '?')}")
            print(f"    Gutter angle: {self.geometry.get('gutter_angle_deg', '?')}°")
        
        elif ext == ".onnx":
            try:
                import onnxruntime as ort
                self.session = ort.InferenceSession(path)
                print(f"  ✓ ONNX policy loaded: {path}")
            except ImportError:
                print("  ❌ ONNX Runtime required for .onnx policy")
                sys.exit(1)
        else:
            print(f"  ❌ Unknown format: {ext}")
            sys.exit(1)
    
    def get_action(self, obs: np.ndarray) -> np.ndarray:
        """Run policy forward pass."""
        if self.w1 is not None:
            h = np.tanh(obs @ self.w1 + self.b1)
            raw = h @ self.w2 + self.b2
            return np.tanh(raw)
        elif hasattr(self, 'session'):
            input_name = self.session.get_inputs()[0].name
            output = self.session.run(None, {input_name: obs.reshape(1, -1).astype(np.float32)})
            return output[0][0]
        else:
            return np.zeros(4)
    
    def export_onnx(self, output_path: str):
        """Export policy to ONNX format for production inference."""
        try:
            import torch
            import torch.nn as nn
            
            obs_dim = self.config.get("obs_dim", 23)
            action_dim = self.config.get("action_dim", 4)
            
            class PolicyNet(nn.Module):
                def __init__(self):
                    super().__init__()
                    self.fc1 = nn.Linear(obs_dim, 64)
                    self.fc2 = nn.Linear(64, action_dim)
                
                def forward(self, x):
                    h = torch.tanh(self.fc1(x))
                    return torch.tanh(self.fc2(h))
            
            model = PolicyNet()
            model.fc1.weight.data = torch.FloatTensor(self.w1.T)
            model.fc1.bias.data = torch.FloatTensor(self.b1)
            model.fc2.weight.data = torch.FloatTensor(self.w2.T)
            model.fc2.bias.data = torch.FloatTensor(self.b2)
            model.eval()
            
            dummy_input = torch.randn(1, obs_dim)
            torch.onnx.export(
                model, dummy_input, output_path,
                input_names=["observation"],
                output_names=["action"],
                dynamic_axes={"observation": {0: "batch"}, "action": {0: "batch"}},
            )
            print(f"  ✓ ONNX exported: {output_path}")
            
        except ImportError:
            # Fallback: save as numpy-based format
            print("  ⚠️ PyTorch not available, saving numpy policy")
            np_path = output_path.replace(".onnx", "_numpy.json")
            with open(np_path, 'w') as f:
                json.dump(self.policy_data, f, indent=2)
            print(f"  ✓ NumPy policy saved: {np_path}")
    
    def validate(self, num_episodes: int = 100) -> Dict[str, Any]:
        """
        Validate policy in simulated environment.
        Runs episodes and reports success rate.
        """
        from rl_env_harvest import HarvestRLEnv, RLConfig
        
        config = RLConfig(max_episode_steps=150)
        env = HarvestRLEnv(config=config)
        
        successes = 0
        rewards = []
        collision_count = 0
        wall_violations = 0
        
        for ep in range(num_episodes):
            obs = env.reset()
            ep_reward = 0
            
            for step in range(config.max_episode_steps):
                action = self.get_action(obs)
                obs, reward, done, info = env.step(action)
                ep_reward += reward
                
                if info.get("wall_collision"):
                    wall_violations += 1
                if info.get("gutter_collision"):
                    collision_count += 1
                
                if done:
                    if info.get("success"):
                        successes += 1
                    break
            
            rewards.append(ep_reward)
        
        results = {
            "episodes": num_episodes,
            "success_rate": round(successes / num_episodes * 100, 1),
            "avg_reward": round(np.mean(rewards), 2),
            "std_reward": round(np.std(rewards), 2),
            "wall_violations": wall_violations,
            "gutter_collisions": collision_count,
            "wall_violation_rate": round(wall_violations / max(1, num_episodes), 2),
        }
        
        print(f"\n  📊 Validation Results ({num_episodes} episodes):")
        print(f"     Success rate:     {results['success_rate']}%")
        print(f"     Avg reward:       {results['avg_reward']}")
        print(f"     Wall violations:  {results['wall_violations']}")
        print(f"     Gutter collisions: {results['gutter_collisions']}")
        
        return results


# ══════════════════════════════════════════════
# Deployment Package Generator
# ══════════════════════════════════════════════

def generate_deployment_package(policy_path: str, output_dir: str):
    """
    Generate a deployment package for physical robot.
    
    Package includes:
    - Policy weights (ONNX or JSON)
    - Farm geometry config
    - Camera calibration
    - ROS2 launch configuration (template)
    """
    os.makedirs(output_dir, exist_ok=True)
    
    runner = PolicyRunner(policy_path)
    
    # Copy policy
    import shutil
    shutil.copy2(policy_path, os.path.join(output_dir, "policy.json"))
    
    # Generate deployment config
    deploy_config = {
        "version": "1.0",
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "policy": {
            "type": "json",
            "file": "policy.json",
            "obs_dim": runner.config.get("obs_dim", 23),
            "action_dim": runner.config.get("action_dim", 4),
            "action_scale": runner.config.get("action_scale", 0.05),
        },
        "geometry": runner.geometry,
        "camera": {
            "model": "Intel RealSense D435",
            "resolution": [640, 480],
            "fps": 30,
            "depth_range_m": [0.1, 3.0],
        },
        "robot": {
            "model": "Franka Panda",
            "dof": 7,
            "max_reach_m": 0.855,
            "gripper": "Franka Hand",
            "controller": "RMPflow",
        },
        "safety": {
            "max_speed_m_s": 0.5,
            "max_force_n": 5.0,
            "wall_clearance_m": 0.35,
            "emergency_stop_enabled": True,
        },
    }
    
    config_path = os.path.join(output_dir, "deploy_config.json")
    with open(config_path, 'w') as f:
        json.dump(deploy_config, f, indent=2)
    
    # Generate ROS2 launch template
    ros2_launch = """# Farmbase ROS2 Deployment Launch File
# Auto-generated — DO NOT EDIT manually

# Prerequisites:
#   ros2 launch franka_bringup franka.launch.py
#   ros2 launch realsense2_camera rs_launch.py

# Launch harvester node:
#   ros2 launch farmbase_harvester harvest.launch.py

import os
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='farmbase_harvester',
            executable='harvest_node',
            name='farmbase_harvester',
            parameters=[{
                'policy_path': 'policy.json',
                'control_rate': 30.0,
                'action_scale': 0.05,
                'wall_clearance': 0.35,
                'gutter_angle_deg': 30.0,
            }],
        ),
    ])
"""
    
    launch_path = os.path.join(output_dir, "harvest_launch.py")
    with open(launch_path, 'w') as f:
        f.write(ros2_launch)
    
    print(f"\n  📦 Deployment package generated: {output_dir}")
    print(f"     policy.json       — Trained weights")
    print(f"     deploy_config.json — Robot + geometry config")
    print(f"     harvest_launch.py — ROS2 launch template")


# ══════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Farmbase Deploy Policy")
    parser.add_argument("--policy", required=True, help="Path to trained policy")
    parser.add_argument("--validate", action="store_true", help="Run validation")
    parser.add_argument("--validate-episodes", type=int, default=100)
    parser.add_argument("--export-onnx", action="store_true", help="Export to ONNX")
    parser.add_argument("--deploy-package", action="store_true", help="Generate deployment package")
    parser.add_argument("--output-dir", default=None)
    
    args = parser.parse_args()
    
    print(f"\n{'='*50}")
    print(f"🚀 Farmbase Policy Deployment")
    print(f"{'='*50}")
    
    runner = PolicyRunner(args.policy)
    
    if args.validate:
        runner.validate(num_episodes=args.validate_episodes)
    
    if args.export_onnx:
        out = args.output_dir or os.path.join(SCRIPT_DIR, "output")
        os.makedirs(out, exist_ok=True)
        runner.export_onnx(os.path.join(out, "harvest_policy.onnx"))
    
    if args.deploy_package:
        out = args.output_dir or os.path.join(SCRIPT_DIR, "output", "deploy_package")
        generate_deployment_package(args.policy, out)
    
    print(f"\n{'='*50}")
