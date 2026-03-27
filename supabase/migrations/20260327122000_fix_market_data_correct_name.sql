/*
  Fix: The crop is stored as 'Enoki Mushroom' in the database 
  (displayed as 'Tochiotome Strawberry' via client-side override).
  Previous migrations targeted wrong name.
  
  This migration:
  1. Updates market_data with research-backed values
  2. Sets min_area_sqm = 3 m² (ergonomic for 180cm/87kg person with 4-tier vertical rack)
  
  Ergonomic area calculation (180cm tall, 87kg):
  - 4-tier rack footprint: 60cm × 120cm = 0.72 m² per rack
  - Aisle width for comfortable bending/reaching: 70cm
  - 2 racks facing each other with shared aisle:
    - Racks: 2 × 0.72 = 1.44 m²
    - Central aisle (harvesting): 0.7 × 1.2 = 0.84 m²
    - End buffer (turning): 0.6 × 1.2 = 0.72 m²
    - Total: ~3.0 m² minimum
*/

UPDATE crops
SET market_data = '{
  "price_per_kg_usd": 17.40,
  "price_per_kg_thb": 600,
  "usd_thb_rate": 34.5,
  "yield_per_sqm_kg": 8.5,
  "demand_index": 0.95,
  "seasonality": ["winter", "spring", "year-round-indoor"],
  "capex_per_sqm_usd": 435,
  "opex_per_cycle_usd": 29,
  "min_area_sqm": 3,
  "vertical_tiers": 4,
  "price_trend_emoji": "📈"
}'::jsonb
WHERE name = 'Enoki Mushroom';
