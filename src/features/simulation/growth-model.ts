import type { Crop, CropOptimalConditions, GrowthParams } from '@/types/models';

export interface GrowthState {
  height: number;
  health: number;
  biomass: number;
  healthColor: [number, number, number];
  wiltFactor: number;
}

function logistic(t: number, K: number, r: number, t0: number): number {
  return K / (1 + Math.exp(-r * (t - t0)));
}

function computeStressFactor(
  value: number,
  optimal: number,
  min: number,
  max: number
): number {
  if (value < min || value > max) {
    const dist = value < min ? min - value : value - max;
    const range = max - min;
    return Math.max(0, 1 - (dist / range) * 2);
  }
  const distFromOpt = Math.abs(value - optimal);
  const maxDist = Math.max(optimal - min, max - optimal);
  return 1 - (distFromOpt / maxDist) * 0.3;
}

export function computeGrowth(
  day: number,
  environment: { temperature: number; humidity: number; co2: number; light: number },
  crop: Crop
): GrowthState {
  const gp = crop.growth_params;
  const opt = crop.optimal_conditions;

  const tempStress = computeStressFactor(
    environment.temperature,
    opt.temperature.optimal,
    opt.temperature.min,
    opt.temperature.max
  );
  const humStress = computeStressFactor(
    environment.humidity,
    opt.humidity.optimal,
    opt.humidity.min,
    opt.humidity.max
  );
  const co2Stress = computeStressFactor(
    environment.co2,
    opt.co2.optimal,
    opt.co2.min,
    opt.co2.max
  );
  const lightStress = computeStressFactor(
    environment.light,
    opt.light.optimal,
    opt.light.min,
    opt.light.max
  );

  const overallHealth =
    tempStress * 0.35 + humStress * 0.25 + co2Stress * 0.2 + lightStress * 0.2;

  const effectiveR = gp.growth_rate_r * overallHealth;
  const rawHeight = logistic(day, gp.carrying_capacity_K, effectiveR, gp.midpoint_t0);
  const height = Math.max(0, rawHeight);
  const heightFraction = height / gp.carrying_capacity_K;
  const biomass = height * gp.biomass_density_g_per_cm3 * overallHealth;

  const wiltFactor = Math.max(0, 1 - overallHealth);

  const healthColor: [number, number, number] = [
    0.85 + (1 - overallHealth) * 0.15,
    0.92 * overallHealth + 0.4 * (1 - overallHealth),
    0.78 * overallHealth + 0.25 * (1 - overallHealth),
  ];

  return {
    height: Math.round(height * 100) / 100,
    health: Math.round(overallHealth * 100),
    biomass: Math.round(biomass * 100) / 100,
    healthColor,
    wiltFactor,
  };
}

export interface ROIResult {
  revenue: number;
  cost: number;
  netROI: number;
  roiPercent: number;
  estimatedYield: number;
  pricePerKg: number;
  pricePerKgThb: number;
  priceChangePct: number;
  capitalCost: number;
  operatingCost: number;
}

export function computeROI(
  crop: Crop,
  healthPercent: number,
  areaSquareMeters: number = 10
): ROIResult {
  const md = crop.market_data;
  const healthFactor = healthPercent / 100;

  const estimatedYield = md.yield_per_sqm_kg * areaSquareMeters * healthFactor;
  const revenue = estimatedYield * md.price_per_kg_usd;
  const capitalCost = md.capex_per_sqm_usd * areaSquareMeters;
  const operatingCost = md.opex_per_cycle_usd * areaSquareMeters;
  const cost = capitalCost + operatingCost;
  const netROI = revenue - cost;
  const roiPercent = cost > 0 ? (netROI / cost) * 100 : 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    netROI: Math.round(netROI * 100) / 100,
    roiPercent: Math.round(roiPercent * 10) / 10,
    estimatedYield: Math.round(estimatedYield * 10) / 10,
    pricePerKg: md.price_per_kg_usd,
    pricePerKgThb: md.price_per_kg_thb || Math.round(md.price_per_kg_usd * (md.usd_thb_rate || 34.5) * 100) / 100,
    priceChangePct: md.price_change_pct || 0,
    capitalCost: Math.round(capitalCost * 100) / 100,
    operatingCost: Math.round(operatingCost * 100) / 100,
  };
}
