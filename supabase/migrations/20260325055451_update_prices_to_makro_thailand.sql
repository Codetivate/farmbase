/*
  # Update market prices to Thai Makro wholesale rates

  1. Modified Tables
    - `crops` - Updated market_data JSONB for both crops
  
  2. Price Changes
    - Enoki Mushroom: price_per_kg updated from $12.50 to $1.54 (53 THB/kg at Makro)
      - capex_per_sqm: $45 -> $8.70 (300 THB/sqm indoor mushroom setup)
      - opex_per_cycle: $8.50 -> $2.90 (100 THB/cycle)
    - Napa Cabbage: price_per_kg updated from $2.80 to $0.58 (20 THB/kg at Makro)
      - capex_per_sqm: $15 -> $2.90 (100 THB/sqm open field)
      - opex_per_cycle: $4.20 -> $1.16 (40 THB/cycle)

  3. Notes
    - Prices based on Makro Thailand wholesale rates (2025)
    - Enoki: 50-53 THB/kg wholesale at Makro Pro
    - Napa Cabbage: 15-25 THB/kg wholesale at Makro
    - All values stored in USD with 34.5 THB/USD exchange rate
*/

UPDATE crops
SET market_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      market_data,
      '{price_per_kg_usd}', '1.54'::jsonb
    ),
    '{capex_per_sqm_usd}', '8.70'::jsonb
  ),
  '{opex_per_cycle_usd}', '2.90'::jsonb
)
WHERE name = 'Enoki Mushroom';

UPDATE crops
SET market_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      market_data,
      '{price_per_kg_usd}', '0.58'::jsonb
    ),
    '{capex_per_sqm_usd}', '2.90'::jsonb
  ),
  '{opex_per_cycle_usd}', '1.16'::jsonb
)
WHERE name = 'Napa Cabbage';