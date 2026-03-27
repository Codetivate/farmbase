/*
  Update Tochiotome min_area_sqm from 2 to 3 m²
  
  Ergonomic calculation for user (180cm tall, 87kg):
  - Shoulder width: ~50cm
  - Minimum comfortable aisle width: 70cm (for bending/crouching at lower tiers)
  - 4-tier vertical rack footprint: 60cm × 120cm = 0.72 m² per rack
  
  Layout for 1 rack + walkway access on 3 sides:
  - Rack: 1.2m × 0.6m
  - Front aisle (harvesting): 0.7m × 1.2m = 0.84 m²
  - Side access buffers: 0.3m × 0.6m × 2 = 0.36 m²
  - Total footprint per rack unit: ~1.92 m² → 2 m² per rack
  
  For minimum viable setup (2 racks, facing each other, shared aisle):
  - 2 racks: 2 × 0.72 = 1.44 m²
  - Central aisle (0.7m wide): 0.7 × 1.2 = 0.84 m²
  - End buffers (0.3m each side): 0.6 × 1.2 = 0.72 m²
  - Total: ~3.0 m² minimum
  
  This ensures a 180cm/87kg person can:
  ✓ Walk between racks without squeezing
  ✓ Bend down to access tier 1 (ground level)
  ✓ Reach tier 4 (~160cm height) comfortably
  ✓ Turn around to place harvested fruit in container
*/

UPDATE crops
SET market_data = jsonb_set(market_data, '{min_area_sqm}', '3')
WHERE name = 'Tochiotome Strawberry';
