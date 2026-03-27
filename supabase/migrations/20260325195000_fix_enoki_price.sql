-- Fix the market_data JSON key for Enoki Mushroom
UPDATE public.crops 
SET market_data = '{"demand_index": 92, "price_per_kg_usd": 2.50, "yield_per_sqm_kg": 14, "price_trend_emoji": "📈"}'::jsonb 
WHERE name = 'Enoki Mushroom';
