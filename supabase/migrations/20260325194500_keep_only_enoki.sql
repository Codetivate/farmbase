-- Delete all crops except Enoki Mushroom
DELETE FROM public.crops WHERE name != 'Enoki Mushroom';

-- Insert Enoki Mushroom if it does not exist
INSERT INTO public.crops (
  name, scientific_name, category, optimal_conditions, growth_params, market_data, tags, image_url, is_published, benefit_summary_en, benefit_summary_th
) 
SELECT 
  'Enoki Mushroom', 
  'Flammulina velutipes', 
  'mushroom', 
  '{"co2": {"optimal": 800, "tolerance": 150}, "light": {"optimal": 50, "tolerance": 50}, "humidity": {"optimal": 90, "tolerance": 5}, "temperature": {"optimal": 12, "tolerance": 2}}'::jsonb,
  '{"max_height_cm": 15, "cycle_days": 35, "growth_rate": 0.15, "midpoint_day": 20}'::jsonb,
  '{"demand_index": 92, "price_per_kg": 2.50, "yield_per_sqm_kg": 14, "price_trend_emoji": "📈"}'::jsonb,
  ARRAY['indoor', 'mushroom', 'high-roi', 'winter'], 
  'https://images.pexels.com/photos/13441977/pexels-photo-13441977.jpeg?auto=compress&cs=tinysrgb', 
  true, 
  'Enoki mushroom is rich in beta-glucans.', 
  'เห็ดเข็มทองอุดมไปด้วยเบต้ากลูแคน ช่วยเสริมสร้างภูมิคุ้มกัน'
WHERE NOT EXISTS (
  SELECT 1 FROM crops WHERE name = 'Enoki Mushroom'
);

-- Update the image just in case it already existed but had the wrong image
UPDATE public.crops 
SET image_url = 'https://images.pexels.com/photos/13441977/pexels-photo-13441977.jpeg?auto=compress&cs=tinysrgb' 
WHERE name = 'Enoki Mushroom';
