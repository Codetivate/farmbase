/*
  Update Tochiotome Strawberry market_data with research-backed values:
  
  PRICE (Thai Market 2025-2026):
  - Thai-grown Japanese strawberry (Chiang Mai): ~800-1,000 ฿/kg retail
  - Imported Tochiotome (Lotus/Tops): ~1,500-2,250 ฿/kg
  - Korean strawberry (Makro, 2024): ~139 ฿/box (~300g) ≈ 460 ฿/kg
  - Conservative farm-gate price for locally grown premium: ~600 ฿/kg = ~17.4 USD/kg
  
  YIELD (Vertical Farming Research):
  - Small-scale PFAL (4-tier rack): 12-40 kg/m²/year (Artechno, Ferme d'Hiver)
  - Per 90-day cycle with 4 tiers: ~8.5 kg/m² floor area
  - Takahashi 2024: Tochiotome ~2.1 kg/m²/cycle (single tier)
  - 4 tiers × 2.1 = ~8.5 kg/m²/cycle (floor area basis)
  
  COST (Residential 8sqm Room-in-Room):
  - CAPEX: LED rack system + climate control + hydroponic = ~120,000 ฿ / 8m² = ~435 USD/m²
  - OPEX: electricity + nutrient + CO2 per 90-day cycle = ~8,000 ฿ / 8m² = ~29 USD/m²/cycle
  
  MINIMUM AREA: 2 m² (one 4-tier vertical rack, 0.6m × 1.2m footprint × 4 levels)
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
  "min_area_sqm": 2,
  "vertical_tiers": 4,
  "price_trend_emoji": "📈"
}'::jsonb
WHERE name = 'Tochiotome Strawberry';
