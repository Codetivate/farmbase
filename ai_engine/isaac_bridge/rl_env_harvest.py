"""
Farmbase RL Harvest Environment — Isaac Lab Training
=====================================================
Reinforcement Learning environment for training a strawberry
picking policy using Isaac Lab (Isaac Sim + RL framework).

KEY DESIGN: Wall-Side Accessibility Constraint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The 12m² room has racks against walls. Solution:
  1. Angled gutters (Oishii-style, 30° tilt toward aisle)
     → All berries hang on the aisle side
  2. Wall clearance = 0.35m (maintenance access only)
  3. Robot operates ONLY from the center aisle (0.80m wide)
  4. Reachability envelope: Franka Panda 855mm reach
     → From aisle center, reaching both rack faces

This means the RL policy must learn:
  - Approach from aisle side only (no wall-side access)
  - Account for gutter angle when planning grasp
  - Handle varying berry heights across 5 tiers
  - Avoid collision with gutter lips and LED bars

Reference:
  - Dogtooth Gen5: single-aisle harvester, 95%+ success
  - agroBot SW6010: angled approach for strawberry picking
  - Xiong 2024: RL-based strawberry grasping

⚠️  Designed for Isaac Lab (Isaac Sim extension)
    Run with: python.bat rl_env_harvest.py
"""

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ══════════════════════════════════════════════
# FARM GEOMETRY CONSTRAINTS
# (Solves the wall-side harvesting problem)
# ══════════════════════════════════════════════

@dataclass
class FarmGeometry:
    """
    Physical layout that ensures ALL berries are accessible
    from the center aisle only.
    
    Cross-section view (looking down the rack):
    
    ┌─────────────────────────────────────┐
    │  WALL                                │
    │  ←35cm→                              │
    │  ┌─────────────┐                     │
    │  │  RACK 1     │╲ gutter angled 30°  │
    │  │  (5 tiers)  │ ╲ berries hang→     │
    │  └─────────────┘  ╲→ 🍓🍓🍓        │
    │                                      │
    │  ←────── AISLE 80cm ──────→          │
    │         🤖 ROBOT HERE               │
    │                                      │
    │  ┌─────────────┐                     │
    │  │  RACK 2     │╲ gutter angled 30°  │
    │  │  (5 tiers)  │ ╲ berries hang→     │
    │  └─────────────┘  ╲→ 🍓🍓🍓        │
    │  ←35cm→                              │
    │  WALL                                │
    └─────────────────────────────────────┘
    
    Key insight: With 30° angled gutters, ALL berries
    naturally hang toward the aisle center. The robot
    never needs to access the wall side.
    """
    
    # Room
    room_width: float = 4.0    # meters (X axis)
    room_depth: float = 3.0    # meters (Y axis)
    room_height: float = 2.8   # meters (Z axis)
    
    # Rack placement
    wall_clearance: float = 0.35    # gap between rack back and wall
    rack_depth: float = 0.40        # rack frame depth
    aisle_width: float = 0.80       # center aisle width
    num_racks: int = 2              # racks (one on each side)
    
    # Gutter geometry (Oishii-style angled)
    gutter_angle_deg: float = 30.0  # tilt toward aisle
    gutter_length: float = 1.80     # meters along X
    num_tiers: int = 5
    tier_spacing: float = 0.35      # meters between tiers
    first_tier_height: float = 0.30 # bottom tier Z
    
    # Berry distribution
    plants_per_gutter: int = 14     # at 12cm spacing
    plant_spacing: float = 0.12     # meters
    berry_hang_offset: float = 0.08 # how far berry hangs below gutter
    
    # Robot (Franka Panda)
    robot_base_height: float = 0.275  # AMR platform height
    robot_reach: float = 0.855        # max reach (meters)
    
    @property
    def gutter_angle_rad(self) -> float:
        return math.radians(self.gutter_angle_deg)
    
    @property
    def berry_offset_y(self) -> float:
        """How far berries extend toward aisle due to gutter angle."""
        return math.sin(self.gutter_angle_rad) * 0.15  # 15cm gutter width
    
    @property
    def rack_positions(self) -> List[Dict[str, float]]:
        """Get Y positions of each rack center."""
        half_room = self.room_depth / 2
        positions = []
        
        # Rack 1: near -Y wall
        r1_y = -half_room + self.wall_clearance + self.rack_depth / 2
        positions.append({
            "y": r1_y,
            "berry_y": r1_y + self.rack_depth / 2 + self.berry_offset_y,
            "face": "positive_y",  # berries face toward +Y (aisle)
        })
        
        # Rack 2: near +Y wall
        r2_y = half_room - self.wall_clearance - self.rack_depth / 2
        positions.append({
            "y": r2_y,
            "berry_y": r2_y - self.rack_depth / 2 - self.berry_offset_y,
            "face": "negative_y",  # berries face toward -Y (aisle)
        })
        
        return positions[:self.num_racks]
    
    def get_berry_positions(self, randomize: bool = True) -> List[np.ndarray]:
        """
        Generate all berry positions in world coordinates.
        All berries are on the AISLE side of the rack.
        """
        positions = []
        rng = np.random.RandomState(42) if randomize else None
        
        for rack in self.rack_positions:
            for tier in range(self.num_tiers):
                z = self.first_tier_height + tier * self.tier_spacing
                
                for plant in range(self.plants_per_gutter):
                    x = -self.gutter_length / 2 + plant * self.plant_spacing + 0.06
                    y = rack["berry_y"]
                    berry_z = z - self.berry_hang_offset
                    
                    if randomize and rng is not None:
                        # Domain randomization
                        x += rng.uniform(-0.02, 0.02)
                        y += rng.uniform(-0.01, 0.01)
                        berry_z += rng.uniform(-0.015, 0.015)
                    
                    positions.append(np.array([x, y, berry_z]))
        
        return positions
    
    def is_reachable(self, berry_pos: np.ndarray, robot_pos: np.ndarray) -> bool:
        """Check if a berry is within robot reach from current position."""
        # Robot base is in the aisle (Y ≈ 0)
        dx = berry_pos[0] - robot_pos[0]
        dy = berry_pos[1] - robot_pos[1]
        dz = berry_pos[2] - (robot_pos[2] + self.robot_base_height)
        dist = math.sqrt(dx*dx + dy*dy + dz*dz)
        return dist <= self.robot_reach
    
    def get_reachable_zone(self) -> Dict[str, Tuple[float, float]]:
        """Get the XYZ bounds of the reachable workspace."""
        return {
            "x": (-self.gutter_length / 2, self.gutter_length / 2),
            "y": (-self.aisle_width / 2 - 0.3, self.aisle_width / 2 + 0.3),
            "z": (self.first_tier_height - 0.1,
                  self.first_tier_height + self.num_tiers * self.tier_spacing + 0.1),
        }


# ══════════════════════════════════════════════
# RL ENVIRONMENT
# ══════════════════════════════════════════════

@dataclass
class RLConfig:
    """RL training hyperparameters."""
    # Environment
    num_envs: int = 64              # parallel environments
    max_episode_steps: int = 200    # steps per episode
    physics_dt: float = 1/120       # physics timestep
    control_dt: float = 1/30        # control frequency
    
    # Observation space (dim = 23)
    # Joint positions (7) + joint velocities (7) +
    # EE position (3) + berry relative pos (3) +
    # gripper state (1) + berry ripeness (1) + tier (1)
    obs_dim: int = 23
    
    # Action space (dim = 4)
    # Delta EE position (3) + gripper open/close (1)
    action_dim: int = 4
    action_scale: float = 0.05     # max 5cm per step
    
    # Rewards
    reward_pick_success: float = 10.0
    reward_approach: float = 0.1    # per step closer
    reward_collision: float = -5.0
    reward_out_of_reach: float = -2.0
    reward_timestep: float = -0.05  # encourage speed
    reward_wall_penalty: float = -3.0   # ← NEW: penalize wall approach
    reward_gutter_bonus: float = 0.5    # ← NEW: bonus for correct angle
    
    # Domain randomization
    berry_pos_noise: float = 0.02   # ±2cm
    berry_size_noise: float = 0.20  # ±20%
    lighting_noise: float = 0.30    # ±30%
    
    # Training
    learning_rate: float = 3e-4
    gamma: float = 0.99
    batch_size: int = 256
    total_timesteps: int = 1_000_000


class HarvestRLEnv:
    """
    RL Environment for berry harvesting with wall-side constraints.
    
    Key features:
    1. Robot MUST approach from aisle side only
    2. Gutters are angled 30° → berries hang toward robot
    3. Collision avoidance with gutter lips, LED bars, walls
    4. Height-adaptive strategy (5 tiers = different approach angles)
    
    Observation: [joint_pos(7), joint_vel(7), ee_pos(3), 
                  berry_rel(3), gripper(1), ripeness(1), tier(1)]
    Action:      [delta_x, delta_y, delta_z, gripper]
    
    Works in two modes:
    - Isaac Lab (full physics + rendering)
    - NumPy simulation (fast training without Isaac Sim)
    """
    
    def __init__(self, config: Optional[RLConfig] = None, use_isaac: bool = False):
        self.cfg = config or RLConfig()
        self.use_isaac = use_isaac
        self.geometry = FarmGeometry()
        
        # State
        self.step_count = 0
        self.episode_count = 0
        self.current_target: Optional[np.ndarray] = None
        self.current_tier: int = 0
        self.current_ripeness: float = 1.0
        
        # Robot state (simulated)
        self.joint_positions = np.zeros(7)
        self.joint_velocities = np.zeros(7)
        self.ee_position = np.array([0.0, 0.0, 0.5])  # start in aisle center
        self.gripper_state = 0.0  # 0=open, 1=closed
        
        # Workspace limits (aisle-only access)
        reachable = self.geometry.get_reachable_zone()
        self.workspace_min = np.array([
            reachable["x"][0],
            reachable["y"][0],
            reachable["z"][0],
        ])
        self.workspace_max = np.array([
            reachable["x"][1],
            reachable["y"][1],
            reachable["z"][1],
        ])
        
        # Wall boundaries (Y axis)
        half_depth = self.geometry.room_depth / 2
        self.wall_y_min = -half_depth + self.geometry.wall_clearance
        self.wall_y_max = half_depth - self.geometry.wall_clearance
        
        # All possible berry positions
        self.all_berry_positions = self.geometry.get_berry_positions(randomize=True)
        
        # Episode stats
        self._episode_reward = 0.0
        self._picks_this_episode = 0
        self._collisions = 0
        
        # Training metrics
        self.total_picks = 0
        self.total_attempts = 0
        self.total_collisions = 0
        self.episode_rewards = []
    
    def reset(self) -> np.ndarray:
        """Reset environment for new episode."""
        self.step_count = 0
        self.episode_count += 1
        self._episode_reward = 0.0
        self._picks_this_episode = 0
        self._collisions = 0
        
        # Reset robot to aisle center
        self.ee_position = np.array([0.0, 0.0, 0.5])
        self.gripper_state = 0.0
        self.joint_positions = np.zeros(7)
        self.joint_velocities = np.zeros(7)
        
        # Select random target berry (from aisle-accessible positions only)
        idx = np.random.randint(0, len(self.all_berry_positions))
        self.current_target = self.all_berry_positions[idx].copy()
        
        # Add domain randomization
        self.current_target += np.random.uniform(
            -self.cfg.berry_pos_noise,
            self.cfg.berry_pos_noise,
            size=3
        )
        
        # Random tier and ripeness
        self.current_tier = np.random.randint(0, self.geometry.num_tiers)
        self.current_ripeness = np.random.choice([0.0, 0.2, 0.5, 1.0, 0.8],
                                                  p=[0.15, 0.10, 0.15, 0.45, 0.15])
        
        return self._get_obs()
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, Dict]:
        """
        Execute one step.
        
        Action: [delta_x, delta_y, delta_z, gripper]
          - delta_xyz: scaled by action_scale (max 5cm)
          - gripper: >0 = close, ≤0 = open
        
        Returns: (observation, reward, done, info)
        """
        self.step_count += 1
        self.total_attempts += 1
        reward = self.cfg.reward_timestep  # small penalty per step
        done = False
        info = {"success": False}
        
        # Parse action
        delta_pos = np.clip(action[:3], -1, 1) * self.cfg.action_scale
        gripper_cmd = action[3]
        
        # Move end effector
        new_pos = self.ee_position + delta_pos
        
        # ═══ WALL-SIDE CONSTRAINT ═══
        # Penalize moving toward walls (beyond rack back)
        if new_pos[1] < self.wall_y_min or new_pos[1] > self.wall_y_max:
            reward += self.cfg.reward_wall_penalty
            info["wall_collision"] = True
            self._collisions += 1
            # Clamp to wall boundary
            new_pos[1] = np.clip(new_pos[1], self.wall_y_min, self.wall_y_max)
        
        # Clamp to workspace
        new_pos = np.clip(new_pos, self.workspace_min, self.workspace_max)
        
        # Check collision with gutter structures
        collision = self._check_gutter_collision(new_pos)
        if collision:
            reward += self.cfg.reward_collision
            info["gutter_collision"] = True
            self._collisions += 1
            self.total_collisions += 1
        else:
            self.ee_position = new_pos
        
        # Gripper control
        if gripper_cmd > 0:
            self.gripper_state = min(1.0, self.gripper_state + 0.2)
        else:
            self.gripper_state = max(0.0, self.gripper_state - 0.2)
        
        # ═══ DISTANCE REWARD ═══
        dist_to_berry = np.linalg.norm(self.ee_position - self.current_target)
        reward += self.cfg.reward_approach * max(0, 1.0 - dist_to_berry)
        
        # ═══ APPROACH ANGLE BONUS ═══
        # Reward approaching from correct angle (aisle side)
        berry_y = self.current_target[1]
        ee_y = self.ee_position[1]
        # Check if robot is on the aisle side of the berry
        if abs(ee_y) < abs(berry_y):  # closer to center → good
            reward += self.cfg.reward_gutter_bonus * 0.1
        
        # ═══ PICK ATTEMPT ═══
        if dist_to_berry < 0.03 and self.gripper_state > 0.8:
            # Close enough and gripper closing → attempt pick
            # Success probability based on approach quality
            approach_quality = self._compute_approach_quality()
            
            if np.random.random() < approach_quality:
                reward += self.cfg.reward_pick_success
                info["success"] = True
                self._picks_this_episode += 1
                self.total_picks += 1
                done = True
            else:
                reward += self.cfg.reward_collision * 0.5  # failed grab penalty
                info["failed_pick"] = True
        
        # ═══ EPISODE TERMINATION ═══
        if self.step_count >= self.cfg.max_episode_steps:
            done = True
            info["timeout"] = True
        
        self._episode_reward += reward
        
        if done:
            self.episode_rewards.append(self._episode_reward)
            info["episode_reward"] = self._episode_reward
            info["picks"] = self._picks_this_episode
            info["collisions"] = self._collisions
        
        return self._get_obs(), reward, done, info
    
    def _get_obs(self) -> np.ndarray:
        """Construct observation vector."""
        berry_rel = (self.current_target - self.ee_position) if self.current_target is not None else np.zeros(3)
        
        obs = np.concatenate([
            self.joint_positions,            # 7
            self.joint_velocities,           # 7
            self.ee_position,                # 3
            berry_rel,                       # 3
            [self.gripper_state],            # 1
            [self.current_ripeness],         # 1
            [self.current_tier / 4.0],       # 1 (normalized)
        ])
        return obs.astype(np.float32)
    
    def _check_gutter_collision(self, pos: np.ndarray) -> bool:
        """
        Check if end-effector position collides with gutter geometry.
        Gutters are angled boxes at each tier level.
        """
        for rack in self.geometry.rack_positions:
            rack_y = rack["y"]
            
            for tier in range(self.geometry.num_tiers):
                gutter_z = self.geometry.first_tier_height + tier * self.geometry.tier_spacing
                
                # Simplified collision box for angled gutter
                # Gutter extends from rack center toward aisle
                gutter_y_min = rack_y - self.geometry.rack_depth / 2
                gutter_y_max = rack_y + self.geometry.rack_depth / 2
                gutter_z_min = gutter_z - 0.02
                gutter_z_max = gutter_z + 0.04
                gutter_x_min = -self.geometry.gutter_length / 2
                gutter_x_max = self.geometry.gutter_length / 2
                
                if (gutter_x_min <= pos[0] <= gutter_x_max and
                    gutter_y_min <= pos[1] <= gutter_y_max and
                    gutter_z_min <= pos[2] <= gutter_z_max):
                    return True
        
        return False
    
    def _compute_approach_quality(self) -> float:
        """
        Compute pick success probability based on approach angle.
        Best approach: from aisle side, slightly above berry, gripper vertical.
        
        Returns: probability 0.0 to 0.95
        """
        if self.current_target is None:
            return 0.0
        
        # Factor 1: Approach from aisle side (not wall side)
        berry_y = self.current_target[1]
        ee_y = self.ee_position[1]
        # Robot should be between berry and room center (Y=0)
        aisle_approach = 1.0 if abs(ee_y) < abs(berry_y) else 0.3
        
        # Factor 2: Approach from above (not below berry)
        berry_z = self.current_target[2]
        ee_z = self.ee_position[2]
        above_approach = 1.0 if ee_z >= berry_z - 0.01 else 0.5
        
        # Factor 3: Not too fast (low velocity = gentle pick)
        velocity = np.linalg.norm(self.joint_velocities)
        gentle = 1.0 if velocity < 0.5 else 0.7
        
        # Factor 4: Correct gripper force
        grip_quality = min(1.0, self.gripper_state / 0.8)
        
        # Combined probability
        base_prob = 0.90  # 90% base success
        quality = base_prob * aisle_approach * above_approach * gentle * grip_quality
        
        return min(0.95, quality)
    
    def get_training_stats(self) -> Dict[str, Any]:
        """Get training statistics."""
        recent = self.episode_rewards[-100:] if self.episode_rewards else [0]
        return {
            "total_episodes": self.episode_count,
            "total_picks": self.total_picks,
            "total_attempts": self.total_attempts,
            "success_rate": round(self.total_picks / max(1, self.episode_count) * 100, 1),
            "total_collisions": self.total_collisions,
            "avg_reward_100": round(np.mean(recent), 2),
            "max_reward": round(max(recent), 2) if recent else 0,
        }


# ══════════════════════════════════════════════
# TRAINING LOOP (NumPy-based, no Isaac needed)
# ══════════════════════════════════════════════

class SimpleRLTrainer:
    """
    Minimal PPO-style trainer for validation.
    For production, use Isaac Lab's built-in rl_games or RSL-RL.
    
    This trainer validates:
    1. Environment rewards are shaped correctly
    2. Wall-side constraints are learned
    3. Approach angle matters for success rate
    """
    
    def __init__(self, env: HarvestRLEnv):
        self.env = env
        self.cfg = env.cfg
        
        # Simple policy: 2-layer MLP (weights initialized small)
        self.policy_w1 = np.random.randn(self.cfg.obs_dim, 64) * 0.1
        self.policy_b1 = np.zeros(64)
        self.policy_w2 = np.random.randn(64, self.cfg.action_dim) * 0.1
        self.policy_b2 = np.zeros(self.cfg.action_dim)
        
        self.lr = self.cfg.learning_rate
    
    def get_action(self, obs: np.ndarray) -> np.ndarray:
        """Forward pass through policy network."""
        h = np.tanh(obs @ self.policy_w1 + self.policy_b1)
        raw = h @ self.policy_w2 + self.policy_b2
        
        # Add exploration noise
        noise = np.random.randn(self.cfg.action_dim) * 0.3
        action = np.tanh(raw + noise)
        
        return action
    
    def train(self, num_episodes: int = 1000, log_interval: int = 100):
        """Train the policy."""
        print(f"\n{'='*60}")
        print(f"🤖 Farmbase RL Trainer — Berry Harvesting")
        print(f"{'='*60}")
        print(f"   Observation dim: {self.cfg.obs_dim}")
        print(f"   Action dim:      {self.cfg.action_dim}")
        print(f"   Episodes:        {num_episodes}")
        print(f"   Max steps:       {self.cfg.max_episode_steps}")
        print(f"   Wall constraint: ENABLED (penalty={self.cfg.reward_wall_penalty})")
        print(f"   Gutter angle:    {self.env.geometry.gutter_angle_deg}° (Oishii-style)")
        print(f"{'='*60}\n")
        
        for episode in range(num_episodes):
            obs = self.env.reset()
            episode_reward = 0
            
            for step in range(self.cfg.max_episode_steps):
                action = self.get_action(obs)
                obs, reward, done, info = self.env.step(action)
                episode_reward += reward
                
                # Simple policy gradient update
                if info.get("success"):
                    # Reinforce successful actions
                    self._update_policy(obs, action, reward * 0.01)
                elif info.get("wall_collision"):
                    # Penalize wall approaches
                    self._update_policy(obs, -action, abs(reward) * 0.005)
                
                if done:
                    break
            
            if (episode + 1) % log_interval == 0:
                stats = self.env.get_training_stats()
                print(f"  Ep {episode+1:5d} | "
                      f"Reward: {stats['avg_reward_100']:7.2f} | "
                      f"Success: {stats['success_rate']:5.1f}% | "
                      f"Picks: {stats['total_picks']:4d} | "
                      f"Collisions: {stats['total_collisions']:4d}")
        
        final_stats = self.env.get_training_stats()
        print(f"\n{'='*60}")
        print(f"✅ Training Complete!")
        print(f"   Success rate: {final_stats['success_rate']:.1f}%")
        print(f"   Total picks:  {final_stats['total_picks']}")
        print(f"   Avg reward:   {final_stats['avg_reward_100']:.2f}")
        print(f"{'='*60}")
        
        return final_stats
    
    def _update_policy(self, obs: np.ndarray, action: np.ndarray, lr_scale: float):
        """Minimal gradient update (pseudo policy gradient)."""
        h = np.tanh(obs @ self.policy_w1 + self.policy_b1)
        
        # Update W2 (output layer)
        grad_w2 = np.outer(h, action) * lr_scale
        self.policy_w2 += self.lr * grad_w2
        self.policy_b2 += self.lr * action * lr_scale
    
    def save_policy(self, path: str):
        """Save policy weights."""
        policy_data = {
            "w1": self.policy_w1.tolist(),
            "b1": self.policy_b1.tolist(),
            "w2": self.policy_w2.tolist(),
            "b2": self.policy_b2.tolist(),
            "config": {
                "obs_dim": self.cfg.obs_dim,
                "action_dim": self.cfg.action_dim,
                "action_scale": self.cfg.action_scale,
            },
            "geometry": {
                "gutter_angle_deg": self.env.geometry.gutter_angle_deg,
                "wall_clearance": self.env.geometry.wall_clearance,
                "aisle_width": self.env.geometry.aisle_width,
                "num_tiers": self.env.geometry.num_tiers,
            },
        }
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(policy_data, f, indent=2)
        print(f"  💾 Policy saved: {path}")


# ══════════════════════════════════════════════
# Main — Standalone training test
# ══════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Farmbase RL Harvest Training")
    parser.add_argument("--episodes", type=int, default=500)
    parser.add_argument("--log-interval", type=int, default=50)
    parser.add_argument("--save-policy", default=None)
    args = parser.parse_args()
    
    # Create environment with wall-side constraints
    config = RLConfig(max_episode_steps=150)
    env = HarvestRLEnv(config=config)
    
    # Print geometry info
    geo = env.geometry
    print(f"\n📐 Farm Geometry (Wall-Side Solution):")
    print(f"   Room: {geo.room_width}m × {geo.room_depth}m × {geo.room_height}m")
    print(f"   Wall clearance: {geo.wall_clearance}m")
    print(f"   Aisle width: {geo.aisle_width}m")
    print(f"   Gutter angle: {geo.gutter_angle_deg}° toward aisle")
    print(f"   Tiers: {geo.num_tiers} (from {geo.first_tier_height}m)")
    print(f"   Robot reach: {geo.robot_reach}m")
    print(f"   Berry positions: {len(env.all_berry_positions)}")
    
    # Verify all berries are reachable from aisle
    robot_pos = np.array([0.0, 0.0, 0.0])  # aisle center
    reachable_count = sum(
        1 for bp in env.all_berry_positions
        if geo.is_reachable(bp, robot_pos)
    )
    print(f"   Reachable from aisle: {reachable_count}/{len(env.all_berry_positions)} "
          f"({reachable_count/max(1,len(env.all_berry_positions))*100:.0f}%)")
    
    # Train
    trainer = SimpleRLTrainer(env)
    stats = trainer.train(num_episodes=args.episodes, log_interval=args.log_interval)
    
    # Save policy
    policy_path = args.save_policy or os.path.join(SCRIPT_DIR, "output", "harvest_policy.json")
    trainer.save_policy(policy_path)
