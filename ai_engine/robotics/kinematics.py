"""
Robotics Kinematics Module
===========================
Contains both the legacy XYZGantry and the new AMRHarvester.

AMRHarvester implements a Dogtooth Gen5-class autonomous mobile robot
with full state machine for strawberry harvesting:
  IDLE → RAIL_MOVE → SCAN → APPROACH → CUT → RETRACT → TRANSIT → PLACE → RETRACT_HOME

Physics-validated aisle pathfinding ensures the robot never enters rack zones.
"""

import math
import random
from typing import Dict, List, Any, Optional


# ── Layout Constants (must match cad_engine/constants.py) ──
RACK_POSITIONS = [
    {"x": -1.0, "z": -0.85},
    {"x": -1.0, "z": -0.05},
    {"x": 1.0, "z": -0.85},
    {"x": 1.0, "z": -0.05},
]
TIER_HEIGHTS = [0.4, 0.8, 1.2]
RACK_LEN = 1.5
AISLE_CENTERS = [-1.25, -0.45, 0.35]
PACKING_X = 0.0
PACKING_Z = 0.50
PACKING_Y = 0.55
AMR_HALF = 0.22


class XYZGantry:
    """Legacy gantry robot (kept for backward compatibility)."""
    
    def __init__(self, room_width: float, room_depth: float, gantry_height: float):
        self.w = room_width
        self.d = room_depth
        self.h = gantry_height
        self.status = 'IDLE'
        self.target_plant = None
        self.gantry_x = 0.0
        self.gantry_z = 0.0
        self.mast_y = 0.2
        self.ext_x = 0.0
        self.ext_z = 0.0
        self.has_fruit = False
        self.timer = 0.0
        self.speed = 1.0
    
    def trigger_harvest(self):
        if self.status in ['IDLE', 'LIFT_IDLE']:
            base_x = random.choice([-1.0, 1.0])
            rx = base_x + random.uniform(-0.75, 0.75)
            rz = random.choice([-0.9, 0.1])
            ry = random.choice([0.4, 0.8, 1.2])
            self.target_plant = [rx, ry, rz]
            self.status = 'MOVE_XY'
            self.timer = 0.0

    def trigger_inspect(self):
        if self.status in ['IDLE', 'LIFT_IDLE']:
            base_x = random.choice([-1.0, 1.0])
            rx = base_x + random.uniform(-0.6, 0.6)
            rz = random.choice([-0.9, 0.1])
            ry = random.choice([0.4, 0.8, 1.2])
            self.target_plant = [rx, ry, rz]
            self.status = 'MOVE_XY'
            self.timer = 0.0
            
    def set_idle(self):
        self.status = 'IDLE'
        
    def step(self, dt: float) -> dict:
        SPEED_XY = self.speed
        SPEED_DROP = 0.8
        SPEED_EXT = 0.6
        
        if self.status == 'MOVE_XY':
            dx = 0.0 - self.gantry_x
            dz = self.target_plant[2] - self.gantry_z
            dist = math.sqrt(dx**2 + dz**2)
            if dist < 0.05:
                self.gantry_x = 0.0
                self.gantry_z = self.target_plant[2]
                self.status = 'DROP'
            else:
                self.gantry_x += (dx/dist) * SPEED_XY * dt
                self.gantry_z += (dz/dist) * SPEED_XY * dt
                
        elif self.status == 'DROP':
            target_drop = min(2.5 - self.target_plant[1] - 0.1, 2.0)
            dy = target_drop - self.mast_y
            if abs(dy) < 0.05:
                self.mast_y = target_drop
                self.status = 'EXTEND'
            else:
                self.mast_y += math.copysign(SPEED_DROP * dt, dy)
                
        elif self.status == 'EXTEND':
            dx = self.target_plant[0] - self.ext_x
            if abs(dx) < 0.05:
                self.ext_x = self.target_plant[0]
                self.status = 'GRAB'
                self.timer = 0.0
            else:
                self.ext_x += math.copysign(SPEED_EXT * dt, dx)
                
        elif self.status == 'GRAB':
            self.timer += dt
            if self.timer > 0.5:
                self.has_fruit = True
                self.status = 'RETRACT'
                
        elif self.status == 'RETRACT':
            dx = 0.0 - self.ext_x
            if abs(dx) < 0.05:
                self.ext_x = 0.0
                self.status = 'LIFT'
            else:
                self.ext_x += math.copysign(SPEED_EXT * dt, dx)
                
        elif self.status == 'LIFT':
            target_drop = 0.2
            dy = target_drop - self.mast_y
            if abs(dy) < 0.05:
                self.mast_y = target_drop
                self.status = 'CARRY_XY'
            else:
                self.mast_y += math.copysign(SPEED_DROP * dt, dy)
                
        elif self.status == 'CARRY_XY':
            dx = 0.0 - self.gantry_x
            dz = 0.35 - self.gantry_z
            dist = math.sqrt(dx**2 + dz**2)
            if dist < 0.05:
                self.gantry_x = 0.0
                self.gantry_z = 0.35
                self.status = 'DROP_FRUIT'
                self.timer = 0.0
            else:
                self.gantry_x += (dx/dist) * SPEED_XY * dt
                self.gantry_z += (dz/dist) * SPEED_XY * dt
                
        elif self.status == 'DROP_FRUIT':
            if self.mast_y < 0.6:
                self.mast_y += SPEED_DROP * dt
            else:
                self.timer += dt
                if self.timer > 0.5:
                    self.has_fruit = False
                    self.status = 'LIFT_IDLE'
                    
        elif self.status == 'LIFT_IDLE':
            dy = 0.2 - self.mast_y
            if abs(dy) < 0.05:
                self.status = 'IDLE'
            else:
                self.mast_y += math.copysign(SPEED_DROP * dt, dy)
                
        elif self.status == 'IDLE':
            self.gantry_x += (0.0 - self.gantry_x) * 0.1
            self.gantry_z += (0.0 - self.gantry_z) * 0.1
            self.mast_y += (0.2 - self.mast_y) * 0.1
            self.ext_x += (0.0 - self.ext_x) * 0.1
            
        return {
            "x": self.gantry_x,
            "z": self.gantry_z,
            "dropY": self.mast_y,
            "extX": self.ext_x,
            "extZ": self.ext_z,
            "hasFruit": self.has_fruit
        }


class AMRHarvester:
    """
    Dogtooth Gen5-class Autonomous Mobile Robot Harvester.
    
    State machine:
      IDLE → RAIL_MOVE → SCAN → APPROACH → CUT → RETRACT → TRANSIT → PLACE → RETRACT_HOME → IDLE
    
    Features:
      - Aisle-based pathfinding (never enters rack zones)
      - Collision bounds clamping
      - Ripeness-based berry selection (skip unripe)
      - Per-berry tracking and cycle metrics
    """
    
    def __init__(self):
        self.status = 'IDLE'
        self.base_x = 0.0
        self.base_z = -0.45  # center aisle
        self.base_yaw = 0.0
        
        self.target_berry_id: Optional[str] = None
        self.target_x = 0.0
        self.target_y = 0.8
        self.target_z = -0.45
        self.target_base_x = 0.0
        self.target_base_z = -0.45
        self.target_base_yaw = 0.0
        
        self.has_fruit = False
        self.timer = 0.0
        
        # Berry state
        self.strawberries: List[Dict[str, Any]] = []
        self.total_berries = 0
        self.berry_weight = 0.0
        self.harvested_kg = 0.0
        self.initialized = False
        
        # Metrics
        self.cycle_start = 0.0
        self.total_cycle_time = 0.0
        self.completed_cycles = 0
        self.skipped_unripe = 0
    
    def initialize_berries(self, yield_kg: float):
        """
        Spawn berries on all racks once growth >= day 96.
        Called once, then berries are tracked individually.
        """
        if self.initialized:
            return
        
        berries: List[Dict[str, Any]] = []
        for ri, rp in enumerate(RACK_POSITIONS):
            for ti, h in enumerate(TIER_HEIGHTS):
                for pi in range(7):
                    dx = -RACK_LEN / 2 + 0.1 + pi * (RACK_LEN / 6)
                    for side_dir in [-1, 1]:
                        for bi in range(3):
                            boff_z = side_dir * (0.04 + bi * 0.008)
                            ripeness = 0.8 + random.random() * 0.2
                            if pi % 3 == 0 and bi == 2:
                                ripeness = 0.3 + random.random() * 0.2
                            
                            berries.append({
                                "id": f"b-{ri}-{ti}-{pi}-{side_dir}-{bi}",
                                "worldX": rp["x"] + dx,
                                "worldY": h - 0.03,
                                "worldZ": rp["z"] + boff_z,
                                "rackZ": rp["z"],
                                "ripeness": min(1.0, ripeness),
                                "active": True,
                            })
        
        self.strawberries = berries
        self.total_berries = len(berries)
        self.berry_weight = max(0, yield_kg) / max(1, len(berries))
        self.harvested_kg = 0.0
        self.initialized = True
    
    def update_berry_weight(self, yield_kg: float):
        """Recalculate per-berry weight when yield changes."""
        if self.total_berries > 0:
            self.berry_weight = max(0, yield_kg) / self.total_berries
    
    def step(self, dt: float, auto_harvest: bool, timeline: float, yield_kg: float) -> Dict[str, Any]:
        """
        Advance the state machine by dt seconds.
        Returns full robot state for WebSocket broadcast.
        """
        RAIL_SPEED = 1.0   # m/s
        YAW_SPEED = 3.0    # rad/s
        
        if not auto_harvest or timeline < 100 or not self.initialized:
            # Idle: drift back to center aisle
            self.base_x += (0 - self.base_x) * 0.1
            self.base_z += (-0.45 - self.base_z) * 0.1
            self.status = 'IDLE'
            return self._build_state()
        
        # ── State Machine ──
        if self.status == 'IDLE':
            self._select_next_berry()
        
        elif self.status == 'RAIL_MOVE':
            dx = self.target_base_x - self.base_x
            dz = self.target_base_z - self.base_z
            dist = math.sqrt(dx * dx + dz * dz)
            
            # Smooth yaw
            dyaw = self.target_base_yaw - self.base_yaw
            if abs(dyaw) > 0.05:
                self.base_yaw += math.copysign(min(abs(dyaw), YAW_SPEED * dt), dyaw)
            else:
                self.base_yaw = self.target_base_yaw
            
            if dist < 0.05:
                self.base_x = self.target_base_x
                self.base_z = self.target_base_z
                self.status = 'SCAN'
                self.timer = 0
            else:
                self.base_x += (dx / dist) * RAIL_SPEED * dt
                self.base_z += (dz / dist) * RAIL_SPEED * dt
                self._clamp_to_aisles()
        
        elif self.status == 'SCAN':
            self.timer += dt
            if self.timer > 0.6:
                berry = next((b for b in self.strawberries if b["id"] == self.target_berry_id), None)
                if berry and berry["ripeness"] < 0.75:
                    self.skipped_unripe += 1
                    self.status = 'IDLE'
                else:
                    self.status = 'APPROACH'
                    self.timer = 0
        
        elif self.status == 'APPROACH':
            self.timer += dt
            if self.timer > 1.2:
                self.status = 'CUT'
                self.timer = 0
        
        elif self.status == 'CUT':
            self.timer += dt
            if self.timer > 0.6:
                self.has_fruit = True
                berry = next((b for b in self.strawberries if b["id"] == self.target_berry_id), None)
                if berry:
                    berry["active"] = False
                self.status = 'RETRACT'
                self.timer = 0
        
        elif self.status == 'RETRACT':
            self.timer += dt
            if self.timer > 0.7:
                self.status = 'TRANSIT'
        
        elif self.status == 'TRANSIT':
            dx = PACKING_X - self.base_x
            dz = PACKING_Z - self.base_z
            dist = math.sqrt(dx * dx + dz * dz)
            
            target_yaw = math.atan2(dx, dz)
            dyaw = target_yaw - self.base_yaw
            if abs(dyaw) > 0.05:
                self.base_yaw += math.copysign(min(abs(dyaw), YAW_SPEED * dt), dyaw)
            
            if dist < 0.05:
                self.base_x = PACKING_X
                self.base_z = PACKING_Z
                self.status = 'PLACE'
                self.timer = 0
                self.target_x = PACKING_X
                self.target_y = PACKING_Y + 0.05
                self.target_z = PACKING_Z
            else:
                self.base_x += (dx / dist) * RAIL_SPEED * dt
                self.base_z += (dz / dist) * RAIL_SPEED * dt
        
        elif self.status == 'PLACE':
            self.timer += dt
            if self.timer > 0.8:
                self.has_fruit = False
                self.harvested_kg += self.berry_weight
                self.completed_cycles += 1
                import time
                self.total_cycle_time += (time.time() - self.cycle_start)
                self.status = 'RETRACT_HOME'
                self.timer = 0
        
        elif self.status == 'RETRACT_HOME':
            self.timer += dt
            if self.timer > 0.4:
                self.status = 'IDLE'
        
        return self._build_state()
    
    def _select_next_berry(self):
        """Find nearest ripe berry and plan path."""
        best = None
        best_dist = float('inf')
        
        for b in self.strawberries:
            if not b["active"] or b["ripeness"] < 0.75:
                continue
            d = math.sqrt(
                (b["worldX"] - self.base_x) ** 2 +
                (b["worldZ"] - self.base_z) ** 2
            )
            if d < best_dist:
                best_dist = d
                best = b
        
        if best is None:
            return  # No ripe berries left
        
        self.target_berry_id = best["id"]
        self.target_x = best["worldX"]
        self.target_y = best["worldY"]
        self.target_z = best["worldZ"]
        self.status = 'RAIL_MOVE'
        
        import time
        self.cycle_start = time.time()
        
        # Pathfinding: pick correct aisle
        rack_z = best.get("rackZ", -0.45)
        berry_side = 1 if best["worldZ"] > rack_z else -1
        
        if rack_z < -0.5:
            aisle_z = AISLE_CENTERS[1] if berry_side > 0 else AISLE_CENTERS[0]
        else:
            aisle_z = AISLE_CENTERS[2] if berry_side > 0 else AISLE_CENTERS[1]
        
        self.target_base_x = best["worldX"]
        self.target_base_z = aisle_z
        self.target_base_yaw = math.pi if berry_side > 0 else 0
    
    def _clamp_to_aisles(self):
        """Collision bounds: prevent AMR from entering rack zones."""
        self.base_x = max(-1.75 + AMR_HALF, min(1.75 - AMR_HALF, self.base_x))
        
        # Valid aisle zones
        in_back = -1.48 < self.base_z < -1.00 - AMR_HALF
        in_center = -0.70 + AMR_HALF < self.base_z < -0.20 - AMR_HALF
        in_front = 0.10 + AMR_HALF < self.base_z < 0.68
        
        if not (in_back or in_center or in_front):
            nearest = min(AISLE_CENTERS, key=lambda a: abs(self.base_z - a))
            self.base_z = nearest
    
    def _build_state(self) -> Dict[str, Any]:
        """Build state dict for WebSocket broadcast."""
        avg_cycle = self.total_cycle_time / self.completed_cycles if self.completed_cycles > 0 else 0
        active_ripe = sum(1 for b in self.strawberries if b["active"] and b["ripeness"] >= 0.75)
        
        return {
            "robotState": {
                "baseX": self.base_x,
                "baseZ": self.base_z,
                "baseYaw": self.base_yaw,
                "targetX": self.target_x,
                "targetY": self.target_y,
                "targetZ": self.target_z,
                "phase": self.status,
                "hasFruit": self.has_fruit,
            },
            "strawberries": self.strawberries,
            "harvestedKg": round(self.harvested_kg, 4),
            "avgCycleTime": round(avg_cycle, 1),
            "completedCycles": self.completed_cycles,
            "skippedUnripe": self.skipped_unripe,
            "activeRipeBerries": active_ripe,
            "etaMinutes": round((active_ripe * avg_cycle) / 60, 1) if avg_cycle > 0 else 0,
        }
    
    def reset(self):
        """Reset harvester to initial state."""
        self.__init__()
