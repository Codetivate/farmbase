-- Fix Enoki Mushroom optimal_conditions and growth_params to strictly match TypeScript interfaces
UPDATE public.crops
SET 
  optimal_conditions = '{
    "temperature": {"min": 5, "max": 15, "optimal": 12, "unit": "°C"},
    "humidity": {"min": 85, "max": 95, "optimal": 90, "unit": "%"},
    "co2": {"min": 600, "max": 1200, "optimal": 800, "unit": "ppm"},
    "light": {"min": 0, "max": 100, "optimal": 50, "unit": "μmol"},
    "ph": {"min": 5.5, "max": 6.5, "optimal": 6.0}
  }'::jsonb,
  growth_params = '{
    "max_height_cm": 15, 
    "carrying_capacity_K": 15,
    "growth_rate_r": 0.15, 
    "midpoint_t0": 20,
    "cycle_days": 35,
    "biomass_density_g_per_cm3": 0.8
  }'::jsonb
WHERE name = 'Enoki Mushroom';
