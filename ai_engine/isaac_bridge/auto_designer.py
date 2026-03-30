"""
Auto Designer — AI-Driven Parametric Farm Layout Optimizer
============================================================
Given constraints (room size, budget, crop type, tiers),
generates an optimal farm_config.json and triggers Isaac Sim build.

Optimization targets:
  - Maximize plant count within space constraints
  - Optimize aisle width for robot access (min 0.60m)
  - Balance LED coverage vs energy cost
  - Respect budget constraints for BOM

References:
  - Oishii: 3-tier vertical, 0.80m aisle
  - Plenty: High-density multi-tier
  - Zordi (NVIDIA partner): Digital twin → physical farm
  - Naphrom 2025: Thai smart farm economics
  - EB 2025: LED spectrum optimization
"""

import json
import math
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ══════════════════════════════════════════════
# CROP DATABASE
# ══════════════════════════════════════════════

CROP_DB = {
    "tochiotome": {
        "name": "Tochiotome",
        "name_th": "โทชิโอโทเมะ",
        "type": "strawberry",
        "plant_spacing_m": 0.200,
        "row_width_m": 0.100,
        "min_ppfd": 350,
        "optimal_ppfd": 450,
        "temp_range": (15, 25),
        "optimal_temp": 20,
        "rh_range": (75, 90),
        "cycle_days": 120,
        "yield_kg_per_plant": 0.025,
        "berry_weight_g": 25,
        "price_thb_per_kg": 800,
        "gutter_type": "nft",
        "ref": "Whitaker 2025, Hidaka 2017",
    },
    "akihime": {
        "name": "Akihime",
        "name_th": "อะคิฮิเมะ",
        "type": "strawberry",
        "plant_spacing_m": 0.200,
        "row_width_m": 0.100,
        "min_ppfd": 300,
        "optimal_ppfd": 400,
        "temp_range": (15, 25),
        "optimal_temp": 20,
        "rh_range": (75, 90),
        "cycle_days": 110,
        "yield_kg_per_plant": 0.030,
        "berry_weight_g": 30,
        "price_thb_per_kg": 700,
        "gutter_type": "nft",
        "ref": "Japanese Strawberry Handbook 2023",
    },
    "lettuce": {
        "name": "Lettuce",
        "name_th": "ผักกาดหอม",
        "type": "leafy",
        "plant_spacing_m": 0.150,
        "row_width_m": 0.080,
        "min_ppfd": 200,
        "optimal_ppfd": 300,
        "temp_range": (18, 24),
        "optimal_temp": 21,
        "rh_range": (60, 80),
        "cycle_days": 35,
        "yield_kg_per_plant": 0.200,
        "berry_weight_g": 0,
        "price_thb_per_kg": 120,
        "gutter_type": "nft",
        "ref": "Kozai 2016",
    },
    "enoki": {
        "name": "Enoki Mushroom",
        "name_th": "เห็ดเข็มทอง",
        "type": "mushroom",
        "plant_spacing_m": 0.100,
        "row_width_m": 0.120,
        "min_ppfd": 0,
        "optimal_ppfd": 50,
        "temp_range": (5, 10),
        "optimal_temp": 7,
        "rh_range": (85, 95),
        "cycle_days": 60,
        "yield_kg_per_plant": 0.100,
        "berry_weight_g": 0,
        "price_thb_per_kg": 200,
        "gutter_type": "shelf",
        "ref": "Huang 2022",
    },
}


# ══════════════════════════════════════════════
# BOM PRICE DATABASE (THB)
# ══════════════════════════════════════════════

BOM_PRICES = {
    "post_25x25_per_m": 45,
    "gutter_pvc_per_m": 120,
    "led_bar_40w": 350,
    "led_bar_20w": 200,
    "pir_panel_50mm_per_m2": 950,
    "epoxy_floor_per_m2": 250,
    "ac_12000btu": 12000,
    "ac_9000btu": 9500,
    "ac_18000btu": 16000,
    "nft_pump_25w": 800,
    "nft_tank_60l": 1200,
    "nft_tank_100l": 1800,
    "controller_esp32": 450,
    "sensor_dht22": 150,
    "sensor_co2": 2500,
    "timer_digital": 350,
    "door_pvc_unit": 3500,
}


# ══════════════════════════════════════════════
# DESIGN CONSTRAINTS
# ══════════════════════════════════════════════

@dataclass
class DesignRequest:
    """Input parameters for auto-design."""
    room_width: float = 4.0       # meters
    room_depth: float = 3.0       # meters
    room_height: float = 2.8      # meters (standard ceiling)
    budget_thb: float = 100000    # Thai Baht
    crop: str = "tochiotome"      # crop key from CROP_DB
    max_tiers: int = 5            # max vertical tiers
    min_aisle_width: float = 0.60 # meters — for robot/human access
    wall_thickness: float = 0.05  # PIR insulation
    has_robot: bool = True        # AMR harvester
    optimize_for: str = "yield"   # "yield" | "roi" | "energy"


@dataclass
class DesignResult:
    """Output of the auto-designer."""
    success: bool = False
    config: Dict[str, Any] = field(default_factory=dict)
    bom: List[Dict[str, Any]] = field(default_factory=list)
    total_cost_thb: float = 0
    metrics: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    error: str = ""


# ══════════════════════════════════════════════
# AUTO DESIGNER
# ══════════════════════════════════════════════

class AutoDesigner:
    """
    AI-driven parametric optimizer for indoor farm layouts.
    
    Algorithm:
    1. Calculate usable interior space (room - walls)
    2. Determine optimal rack orientation (along longest axis)
    3. Calculate max racks that fit with aisle spacing
    4. Optimize tier heights for crop + human ergonomics
    5. Size LED, climate, and irrigation systems
    6. Generate BOM and verify against budget
    7. Output farm_config.json
    """

    def __init__(self):
        self.crop_db = CROP_DB
        self.prices = BOM_PRICES

    def design(self, req: DesignRequest) -> DesignResult:
        """
        Generate optimal farm layout from constraints.
        
        Args:
            req: Design constraints
        
        Returns:
            DesignResult with config, BOM, and metrics
        """
        result = DesignResult()

        # Validate crop
        crop = self.crop_db.get(req.crop)
        if not crop:
            result.error = f"Unknown crop: {req.crop}. Available: {list(self.crop_db.keys())}"
            return result

        # ── Step 1: Interior dimensions ──
        inner_w = req.room_width - 2 * req.wall_thickness
        inner_d = req.room_depth - 2 * req.wall_thickness
        inner_h = req.room_height

        if inner_w < 1.0 or inner_d < 1.0:
            result.error = f"Room too small: interior {inner_w:.1f}m × {inner_d:.1f}m"
            return result

        # ── Step 2: Rack orientation (along longest axis) ──
        if inner_d >= inner_w:
            rack_axis = "depth"
            rack_length = inner_d - 0.20  # clearance from walls
            perpendicular = inner_w
        else:
            rack_axis = "width"
            rack_length = inner_w - 0.20
            perpendicular = inner_d

        # Clamp rack length to practical maximum
        rack_length = min(rack_length, 3.0)

        # ── Step 3: How many racks fit? ──
        gutter_width = crop["row_width_m"]
        rack_footprint = gutter_width + 0.10  # gutter + structure
        aisle = max(req.min_aisle_width, 0.60)

        # Layout: aisle | rack | aisle | rack | aisle ...
        # Available = perpendicular - aisle (one end)
        # Each rack needs: rack_footprint + aisle
        space_for_racks = perpendicular - aisle
        racks_fit = max(1, int(space_for_racks / (rack_footprint + aisle)))

        # Verify actual aisle width
        actual_aisle = (perpendicular - racks_fit * rack_footprint) / (racks_fit + 1)
        if actual_aisle < 0.45:
            racks_fit = max(1, racks_fit - 1)
            actual_aisle = (perpendicular - racks_fit * rack_footprint) / (racks_fit + 1)

        if actual_aisle < 0.45:
            result.warnings.append(f"Tight aisles: {actual_aisle:.2f}m — robot may not fit")

        # ── Step 4: Tier heights ──
        # Rules:
        # - Min tier 1 height: 0.35m (above floor for plumbing)
        # - Min between tiers: 0.35m (plant growth + LED space)
        # - Max tier height: room_height - 0.50m (clearance for AC/ceiling)
        # - LED bar sits 0.18m above each tier

        min_tier_1 = 0.35
        min_tier_gap = 0.35
        max_tier_top = inner_h - 0.50
        led_offset = 0.18

        available_height = max_tier_top - min_tier_1
        max_possible_tiers = max(1, int(available_height / (min_tier_gap + led_offset)) + 1)
        num_tiers = min(req.max_tiers, max_possible_tiers)

        if num_tiers <= 1:
            tier_heights = [min_tier_1 + 0.05]
        else:
            gap = available_height / (num_tiers - 1)
            tier_heights = [round(min_tier_1 + i * gap, 2) for i in range(num_tiers)]

        # ── Step 5: Plants per gutter ──
        plants_per_gutter = max(1, int(rack_length / crop["plant_spacing_m"]))
        total_plants = plants_per_gutter * num_tiers * racks_fit

        # ── Step 6: LED sizing ──
        led_watts = 40 if crop["optimal_ppfd"] >= 300 else 20
        led_count = num_tiers * racks_fit
        total_led_watts = led_count * led_watts

        # ── Step 7: Climate sizing ──
        room_area = req.room_width * req.room_depth
        room_volume = room_area * req.room_height

        # AC sizing: ~400 BTU per m² for sealed room + LED heat
        led_heat_btu = total_led_watts * 3.412
        base_cooling_btu = room_area * 400
        total_btu_needed = base_cooling_btu + led_heat_btu

        if total_btu_needed <= 10000:
            ac_model = "ac_9000btu"
            ac_btu = 9000
        elif total_btu_needed <= 14000:
            ac_model = "ac_12000btu"
            ac_btu = 12000
        else:
            ac_model = "ac_18000btu"
            ac_btu = 18000

        # ── Step 8: Irrigation sizing ──
        water_l_per_plant_day = 0.15 if crop["gutter_type"] == "nft" else 0.05
        daily_water = total_plants * water_l_per_plant_day
        tank_size = 60 if daily_water < 30 else 100
        tank_model = f"nft_tank_{tank_size}l"

        # ── Step 9: Generate BOM ──
        bom = []

        # Structure
        post_height = tier_heights[-1] + 0.30
        num_posts = racks_fit * 4
        bom.append({
            "item": "Steel Post 25×25mm",
            "spec": f"{post_height:.1f}m each",
            "qty": num_posts,
            "unit_price": int(self.prices["post_25x25_per_m"] * post_height),
            "total": int(self.prices["post_25x25_per_m"] * post_height * num_posts),
        })

        # Gutters
        gutter_total_m = rack_length * num_tiers * racks_fit
        bom.append({
            "item": "PVC NFT Gutter",
            "spec": f"{rack_length:.1f}m × {gutter_width*100:.0f}cm",
            "qty": num_tiers * racks_fit,
            "unit_price": int(self.prices["gutter_pvc_per_m"] * rack_length),
            "total": int(self.prices["gutter_pvc_per_m"] * gutter_total_m),
        })

        # LEDs
        led_key = f"led_bar_{led_watts}w"
        bom.append({
            "item": f"LED Bar {led_watts}W (Samsung LM301H)",
            "spec": f"{rack_length:.1f}m full-spectrum",
            "qty": led_count,
            "unit_price": self.prices[led_key],
            "total": self.prices[led_key] * led_count,
        })

        # Insulation (walls + ceiling)
        wall_area = 2 * (req.room_width + req.room_depth) * req.room_height
        ceil_area = room_area
        insulation_area = wall_area + ceil_area  # minus door
        bom.append({
            "item": "PIR Insulation Panel 50mm",
            "spec": f"{insulation_area:.1f} m²",
            "qty": 1,
            "unit_price": int(self.prices["pir_panel_50mm_per_m2"] * insulation_area),
            "total": int(self.prices["pir_panel_50mm_per_m2"] * insulation_area),
        })

        # Floor
        bom.append({
            "item": "Epoxy Floor Coating",
            "spec": f"{room_area:.1f} m²",
            "qty": 1,
            "unit_price": int(self.prices["epoxy_floor_per_m2"] * room_area),
            "total": int(self.prices["epoxy_floor_per_m2"] * room_area),
        })

        # AC
        bom.append({
            "item": f"Split AC {ac_btu} BTU",
            "spec": f"R32 inverter",
            "qty": 1,
            "unit_price": self.prices[ac_model],
            "total": self.prices[ac_model],
        })

        # Irrigation
        bom.append({
            "item": "NFT Pump 25W",
            "spec": "submersible",
            "qty": 1,
            "unit_price": self.prices["nft_pump_25w"],
            "total": self.prices["nft_pump_25w"],
        })
        bom.append({
            "item": f"Nutrient Tank {tank_size}L",
            "spec": "food-grade PE",
            "qty": 1,
            "unit_price": self.prices[tank_model],
            "total": self.prices[tank_model],
        })

        # Controls
        bom.append({
            "item": "ESP32 Controller",
            "spec": "WiFi + BLE",
            "qty": 1,
            "unit_price": self.prices["controller_esp32"],
            "total": self.prices["controller_esp32"],
        })
        bom.append({
            "item": "DHT22 Sensor",
            "spec": "temp + humidity",
            "qty": 2,
            "unit_price": self.prices["sensor_dht22"],
            "total": self.prices["sensor_dht22"] * 2,
        })
        bom.append({
            "item": "CO₂ Sensor (MH-Z19B)",
            "spec": "NDIR 0-5000ppm",
            "qty": 1,
            "unit_price": self.prices["sensor_co2"],
            "total": self.prices["sensor_co2"],
        })
        bom.append({
            "item": "Door (PVC)",
            "spec": "0.85m × 2.1m",
            "qty": 1,
            "unit_price": self.prices["door_pvc_unit"],
            "total": self.prices["door_pvc_unit"],
        })

        total_cost = sum(item["total"] for item in bom)

        # Budget check
        if total_cost > req.budget_thb:
            over = total_cost - req.budget_thb
            result.warnings.append(
                f"Over budget by ฿{over:,.0f} (total ฿{total_cost:,.0f} vs budget ฿{req.budget_thb:,.0f})"
            )
            # Try reducing tiers
            if num_tiers > 1 and req.optimize_for != "yield":
                result.warnings.append("Consider reducing tiers to fit budget")

        # ── Step 10: Yield & ROI metrics ──
        yield_per_cycle = total_plants * crop["yield_kg_per_plant"]
        cycles_per_year = 365 / crop["cycle_days"]
        annual_yield = yield_per_cycle * cycles_per_year
        annual_revenue = annual_yield * crop["price_thb_per_kg"]

        # Energy cost estimate
        daily_energy_kwh = (total_led_watts * 16 / 1000) + (ac_btu / 3412 * 24 / 1000 * 8) + 0.5
        monthly_energy_thb = daily_energy_kwh * 30 * 5  # ~5 THB/kWh
        annual_opex = monthly_energy_thb * 12

        roi_months = (total_cost / max(1, (annual_revenue - annual_opex) / 12))

        metrics = {
            "total_plants": total_plants,
            "plants_per_gutter": plants_per_gutter,
            "num_racks": racks_fit,
            "num_tiers": num_tiers,
            "aisle_width_m": round(actual_aisle, 2),
            "rack_length_m": round(rack_length, 2),
            "yield_per_cycle_kg": round(yield_per_cycle, 2),
            "cycles_per_year": round(cycles_per_year, 1),
            "annual_yield_kg": round(annual_yield, 1),
            "annual_revenue_thb": round(annual_revenue),
            "daily_energy_kwh": round(daily_energy_kwh, 1),
            "monthly_energy_thb": round(monthly_energy_thb),
            "annual_opex_thb": round(annual_opex),
            "roi_months": round(roi_months, 1) if roi_months < 999 else "N/A",
            "led_watts_total": total_led_watts,
            "ac_btu": ac_btu,
            "room_area_m2": round(room_area, 1),
        }

        # ── Step 11: Generate config ──
        config = {
            "_comment": "Auto-generated by Farmbase Auto Designer",
            "_version": "1.0.0",
            "_role_models": ["Oishii", "Plenty", "Zordi"],
            "_generated_by": "AutoDesigner",

            "room": {
                "width": req.room_width,
                "depth": req.room_depth,
                "height": req.room_height,
                "wall_thickness": req.wall_thickness,
                "insulation": "PIR_50mm",
                "floor_material": "epoxy_white",
            },

            "racks": {
                "count": racks_fit,
                "tiers_per_rack": num_tiers,
                "tier_heights": tier_heights,
                "orientation": rack_axis,
                "gutter": {
                    "length": round(rack_length, 2),
                    "width": crop["row_width_m"],
                    "depth": 0.040,
                    "material": "pvc_white",
                },
                "post": {
                    "profile": "25x25x1.5",
                    "material": "steel_galvanized",
                },
                "plant_spacing": crop["plant_spacing_m"],
                "plants_per_gutter": plants_per_gutter,
            },

            "lighting": {
                "type": "LED_full_spectrum",
                "model": "Samsung_LM301H",
                "watts_per_bar": led_watts,
                "ppfd_target": crop["optimal_ppfd"],
                "photoperiod_hours": 16 if crop["type"] != "mushroom" else 4,
                "spectrum": {
                    "red_nm": 660,
                    "blue_nm": 450,
                    "ratio_rb": "6:1",
                    "ref": "EB 2025",
                },
            },

            "climate": {
                "temperature_c": crop["optimal_temp"],
                "humidity_rh": (crop["rh_range"][0] + crop["rh_range"][1]) / 2,
                "co2_ppm": 900 if crop["type"] != "mushroom" else 2000,
                "vpd_kpa_target": 0.8,
                "ac_btu": ac_btu,
                "ref": "Naphrom 2025, Yu 2023, Wada 2010",
            },

            "irrigation": {
                "system": crop["gutter_type"].upper(),
                "tank_liters": tank_size,
                "pump_watts": 25,
                "ec_target": 2.0 if crop["type"] == "strawberry" else 1.5,
                "ph_target": 5.8,
                "ref": "AJCS 2025",
            },

            "crop": {
                "variety": crop["name"],
                "variety_th": crop.get("name_th", ""),
                "type": crop["type"],
                "cycle_days": crop["cycle_days"],
                "yield_kg_per_plant": crop["yield_kg_per_plant"],
                "berry_weight_g": crop["berry_weight_g"],
                "harvest_method": "robot" if req.has_robot else "manual",
                "ref": crop["ref"],
            },

            "robot": {
                "enabled": req.has_robot,
                "type": "AMR_harvester",
                "base": "differential_drive",
                "arm_dof": 6,
                "arm_model": "generic_6dof",
                "gripper": "stem_snip_parallel",
                "camera": {
                    "model": "Intel_RealSense_D435",
                    "resolution": [640, 480],
                    "fps": 30,
                    "mount": "wrist",
                },
                "sensor": {
                    "lidar_2d": True,
                    "imu": True,
                },
                "ref": "Dogtooth 2024, Xiong 2024",
            },

            "isaac_sim": {
                "up_axis": "Z",
                "units": "meters",
                "physics_dt": 0.016666,
                "render_dt": 0.016666,
                "gravity": [0, 0, -9.81],
                "output_usd": f"farmbase_auto.usd",
            },

            "budget": {
                "tier": 1 if req.budget_thb < 50000 else (2 if req.budget_thb < 150000 else 3),
                "total_thb": round(total_cost),
                "budget_thb": round(req.budget_thb),
                "currency": "THB",
            },
        }

        result.success = True
        result.config = config
        result.bom = bom
        result.total_cost_thb = total_cost
        result.metrics = metrics
        return result

    def save_config(self, config: Dict[str, Any], path: Optional[str] = None) -> str:
        """Save config to JSON file."""
        if path is None:
            path = os.path.join(SCRIPT_DIR, "farm_config.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return path


# ══════════════════════════════════════════════
# CLI USAGE
# ══════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Farmbase Auto Designer")
    parser.add_argument("--width", type=float, default=4.0, help="Room width (m)")
    parser.add_argument("--depth", type=float, default=3.0, help="Room depth (m)")
    parser.add_argument("--height", type=float, default=2.8, help="Room height (m)")
    parser.add_argument("--budget", type=float, default=100000, help="Budget (THB)")
    parser.add_argument("--crop", default="tochiotome", help="Crop key")
    parser.add_argument("--tiers", type=int, default=5, help="Max tiers")
    parser.add_argument("--no-robot", action="store_true", help="Disable robot")
    parser.add_argument("--output", default=None, help="Output config path")

    args = parser.parse_args()

    req = DesignRequest(
        room_width=args.width,
        room_depth=args.depth,
        room_height=args.height,
        budget_thb=args.budget,
        crop=args.crop,
        max_tiers=args.tiers,
        has_robot=not args.no_robot,
    )

    designer = AutoDesigner()
    result = designer.design(req)

    if result.success:
        path = designer.save_config(result.config, args.output)
        print(f"\n🌱 Farmbase Auto Design Complete!")
        print(f"   Config saved: {path}")
        print(f"\n📊 Metrics:")
        for k, v in result.metrics.items():
            print(f"   {k}: {v}")
        print(f"\n💰 BOM (Total: ฿{result.total_cost_thb:,.0f}):")
        for item in result.bom:
            print(f"   {item['item']}: ×{item['qty']} = ฿{item['total']:,}")
        if result.warnings:
            print(f"\n⚠️  Warnings:")
            for w in result.warnings:
                print(f"   - {w}")
    else:
        print(f"❌ Design failed: {result.error}")
