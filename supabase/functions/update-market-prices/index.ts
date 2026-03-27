/**
 * =============================================================================
 * Edge Function: update-market-prices
 * =============================================================================
 *
 * PURPOSE:
 *   อัปเดตราคาตลาดของพืชทุกชนิดใน DB อัตโนมัติ
 *   ดึงอัตราแลกเปลี่ยน USD/THB จาก open.er-api.com
 *   ดึง Thai agricultural price index จาก NABC API (ถ้ามี)
 *   คำนวณราคาจำลองพร้อม seasonal adjustment และ demand index
 *
 * FLOW:
 *   1. ดึง crops ทั้งหมดจาก DB
 *   2. ดึงอัตราแลกเปลี่ยน + Thai price index พร้อมกัน (Promise.all)
 *   3. loop แต่ละ crop: คำนวณราคา, demand, seasonal adjustment
 *   4. บันทึก market_prices record ใหม่ (is_latest=true, ตัวเก่าตั้งเป็น false)
 *   5. อัปเดต crops.market_data ให้ตรงกับราคาล่าสุด
 *
 * CONNECTED FILES:
 *   - Frontend:   features/marketplace/crop-card.tsx (แสดงราคา)
 *   - Frontend:   store/farm-store.ts (เก็บ crop data)
 *   - DB tables:  crops, market_prices, market_price_config
 *   - External:   open.er-api.com (exchange rate), agriapi.nabc.go.th (Thai prices)
 *
 * CALLED BY:
 *   - POST ${SUPABASE_URL}/functions/v1/update-market-prices
 *   - ออกแบบให้เรียกจาก cron job หรือ manual trigger
 *   - Authorization: Bearer ${SUPABASE_ANON_KEY}
 *
 * PYTHON INTEGRATION (cron job):
 *   ```python
 *   import requests
 *   resp = requests.post(
 *       f"{SUPABASE_URL}/functions/v1/update-market-prices",
 *       headers={"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "Content-Type": "application/json"},
 *       json={}
 *   )
 *   print(resp.json())  # { message, updated, crops[], exchange_rate, timestamp }
 *   ```
 * =============================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** ข้อมูลตลาดพื้นฐานของแต่ละพืช ใช้เป็น baseline สำหรับคำนวณราคาจำลอง */
interface CropMarketDefaults {
  name: string;
  basePrice: number;
  thaiMultiplier: number;
  demandBase: number;
  capex: number;
  opex: number;
  yieldPerSqm: number;
  seasonality: string[];
  volatility: number;
}

const CROP_MARKET_DATA: Record<string, CropMarketDefaults> = {
  "enoki mushroom": {
    name: "Enoki Mushroom",
    basePrice: 8.5,
    thaiMultiplier: 1.15,
    demandBase: 0.82,
    capex: 5.0,
    opex: 2.8,
    yieldPerSqm: 4.2,
    seasonality: ["year-round", "peak-winter"],
    volatility: 0.08,
  },
  "napa cabbage": {
    name: "Napa Cabbage",
    basePrice: 1.8,
    thaiMultiplier: 0.85,
    demandBase: 0.75,
    capex: 2.5,
    opex: 1.2,
    yieldPerSqm: 6.5,
    seasonality: ["fall", "winter", "spring"],
    volatility: 0.12,
  },
  "oyster mushroom": {
    name: "Oyster Mushroom",
    basePrice: 6.0,
    thaiMultiplier: 1.1,
    demandBase: 0.88,
    capex: 4.0,
    opex: 2.2,
    yieldPerSqm: 5.0,
    seasonality: ["year-round"],
    volatility: 0.06,
  },
  "shiitake": {
    name: "Shiitake Mushroom",
    basePrice: 12.0,
    thaiMultiplier: 1.2,
    demandBase: 0.85,
    capex: 6.0,
    opex: 3.5,
    yieldPerSqm: 3.0,
    seasonality: ["year-round", "peak-autumn"],
    volatility: 0.07,
  },
  "lettuce": {
    name: "Lettuce",
    basePrice: 2.5,
    thaiMultiplier: 0.9,
    demandBase: 0.78,
    capex: 3.0,
    opex: 1.5,
    yieldPerSqm: 5.5,
    seasonality: ["year-round"],
    volatility: 0.15,
  },
  "kale": {
    name: "Kale",
    basePrice: 3.2,
    thaiMultiplier: 0.95,
    demandBase: 0.72,
    capex: 2.8,
    opex: 1.3,
    yieldPerSqm: 4.8,
    seasonality: ["fall", "winter"],
    volatility: 0.1,
  },
  "basil": {
    name: "Thai Basil",
    basePrice: 4.5,
    thaiMultiplier: 0.7,
    demandBase: 0.8,
    capex: 2.0,
    opex: 1.0,
    yieldPerSqm: 3.5,
    seasonality: ["year-round", "peak-summer"],
    volatility: 0.09,
  },
  "spinach": {
    name: "Spinach",
    basePrice: 3.0,
    thaiMultiplier: 1.0,
    demandBase: 0.76,
    capex: 2.5,
    opex: 1.2,
    yieldPerSqm: 5.0,
    seasonality: ["fall", "winter", "spring"],
    volatility: 0.11,
  },
};

/** อัตราแลกเปลี่ยน USD/THB สำรอง กรณี API ล่ม */
const USD_THB_BASE = 34.5;

/**
 * ดึงอัตราแลกเปลี่ยน USD -> THB จาก open.er-api.com (ฟรี, ไม่ต้อง key)
 * ถ้า API ล่มจะ fallback เป็น USD_THB_BASE (34.5)
 */
async function fetchExchangeRate(): Promise<number> {
  try {
    const resp = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { headers: { Accept: "application/json" } }
    );
    if (!resp.ok) return USD_THB_BASE;
    const data = await resp.json();
    return data.rates?.THB || USD_THB_BASE;
  } catch {
    return USD_THB_BASE;
  }
}

/**
 * ดึง Thai agricultural price index จาก NABC (สำนักงานเศรษฐกิจการเกษตร)
 * ใช้ปรับ demand index ให้สอดคล้องกับตลาดไทย
 * Return null ถ้า API ไม่ตอบ (ไม่บังคับ ระบบทำงานต่อได้โดยไม่มีค่านี้)
 */
async function fetchThaiAgriPriceIndex(): Promise<number | null> {
  try {
    const resp = await fetch(
      "https://agriapi.nabc.go.th/api/v2/price-index?year=2026&month=3",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Farmbase/1.0",
        },
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.data?.length > 0) {
      return data.data[0].index_value || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * คำนวณ seasonal adjustment factor สำหรับพืช
 * ตรวจว่าเดือนปัจจุบันอยู่ใน season ของพืชหรือไม่
 * Return: 1.15 (peak season), 1.0 (in season), 0.85 (off season)
 */
function computeSeasonalAdjustment(
  seasonality: string[],
  month: number
): number {
  const seasonMonths: Record<string, number[]> = {
    "year-round": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    "peak-summer": [6, 7, 8],
    fall: [9, 10, 11],
    autumn: [9, 10, 11],
    "peak-autumn": [9, 10, 11],
    winter: [12, 1, 2],
    "peak-winter": [12, 1, 2],
  };

  let inSeason = false;
  let peakSeason = false;

  for (const tag of seasonality) {
    const months = seasonMonths[tag];
    if (months?.includes(month)) {
      inSeason = true;
      if (tag.startsWith("peak-")) peakSeason = true;
    }
  }

  if (peakSeason) return 1.15;
  if (inSeason) return 1.0;
  return 0.85;
}

/**
 * คำนวณ demand index (0-1) โดยรวม:
 * - baseDemand ของพืช (จาก CROP_MARKET_DATA)
 * - seasonal adjustment (peak/in/off season)
 * - Thai price index (ถ้ามี, weight 30%)
 * - random noise เล็กน้อย (+-2%) เพื่อจำลองความผันผวน
 */
function computeMarketDemand(
  baseDemand: number,
  seasonalAdj: number,
  thaiPriceIndex: number | null
): number {
  let demand = baseDemand * seasonalAdj;

  if (thaiPriceIndex !== null) {
    const indexFactor = thaiPriceIndex / 100;
    demand = demand * 0.7 + indexFactor * 0.3;
  }

  const noise = (Math.random() - 0.5) * 0.04;
  demand += noise;

  return Math.max(0.1, Math.min(1.0, demand));
}

/**
 * คำนวณราคาจำลอง (USD/kg) โดยรวม basePrice, seasonal, volatility, demand
 * มี random factor เพื่อจำลองความผันผวนตลาดจริง
 */
function computeLivePrice(
  basePrice: number,
  volatility: number,
  seasonalAdj: number,
  demand: number
): number {
  const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
  const demandFactor = 0.8 + demand * 0.4;
  return Math.round(basePrice * seasonalAdj * randomFactor * demandFactor * 100) / 100;
}

/**
 * === MAIN HANDLER ===
 * ดึง crops ทั้งหมด -> fetch exchange rate + Thai index -> คำนวณราคาแต่ละ crop -> บันทึก DB
 * ใช้ service role key เพราะต้องเขียน market_prices + อัปเดต crops (bypass RLS)
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: crops } = await supabase
      .from("crops")
      .select("id, name, market_data");

    if (!crops || crops.length === 0) {
      return new Response(
        JSON.stringify({ message: "No crops found", updated: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const [usdThbRate, thaiPriceIndex] = await Promise.all([
      fetchExchangeRate(),
      fetchThaiAgriPriceIndex(),
    ]);

    const currentMonth = new Date().getMonth() + 1;
    const updatedCrops: string[] = [];

    await supabase
      .from("market_prices")
      .update({ is_latest: false })
      .eq("is_latest", true);

    for (const crop of crops) {
      const cropNameLower = crop.name.toLowerCase();
      const matchKey = Object.keys(CROP_MARKET_DATA).find(
        (k) => cropNameLower.includes(k) || k.includes(cropNameLower.split(" ")[0])
      );

      const defaults = matchKey
        ? CROP_MARKET_DATA[matchKey]
        : {
            name: crop.name,
            basePrice: crop.market_data?.price_per_kg_usd || 5.0,
            thaiMultiplier: 1.0,
            demandBase: crop.market_data?.demand_index || 0.7,
            capex: crop.market_data?.capex_per_sqm_usd || 3.0,
            opex: crop.market_data?.opex_per_cycle_usd || 1.5,
            yieldPerSqm: crop.market_data?.yield_per_sqm_kg || 4.0,
            seasonality: crop.market_data?.seasonality || ["year-round"],
            volatility: 0.1,
          };

      const seasonalAdj = computeSeasonalAdjustment(
        defaults.seasonality,
        currentMonth
      );
      const demand = computeMarketDemand(
        defaults.demandBase,
        seasonalAdj,
        thaiPriceIndex
      );
      const priceUsd = computeLivePrice(
        defaults.basePrice,
        defaults.volatility,
        seasonalAdj,
        demand
      );
      const priceThb = Math.round(priceUsd * usdThbRate * defaults.thaiMultiplier * 100) / 100;

      const previousPrice = crop.market_data?.price_per_kg_usd || defaults.basePrice;
      const priceChangePct =
        previousPrice > 0
          ? Math.round(((priceUsd - previousPrice) / previousPrice) * 10000) / 100
          : 0;

      await supabase.from("market_prices").insert({
        crop_id: crop.id,
        crop_name: crop.name,
        price_per_kg_usd: priceUsd,
        price_per_kg_thb: priceThb,
        usd_thb_rate: usdThbRate,
        source: thaiPriceIndex ? "nabc_th+computed" : "computed",
        source_url: thaiPriceIndex
          ? "https://agriapi.nabc.go.th"
          : "https://open.er-api.com",
        market_region: "both",
        demand_index: Math.round(demand * 100) / 100,
        price_change_pct: priceChangePct,
        previous_price_usd: previousPrice,
        capex_per_sqm_usd: defaults.capex,
        opex_per_cycle_usd: defaults.opex,
        yield_per_sqm_kg: defaults.yieldPerSqm,
        seasonality: defaults.seasonality,
        is_latest: true,
      });

      await supabase
        .from("crops")
        .update({
          market_data: {
            ...crop.market_data,
            price_per_kg_usd: priceUsd,
            demand_index: demand,
            capex_per_sqm_usd: defaults.capex,
            opex_per_cycle_usd: defaults.opex,
            yield_per_sqm_kg: defaults.yieldPerSqm,
            seasonality: defaults.seasonality,
            price_per_kg_thb: priceThb,
            usd_thb_rate: usdThbRate,
            price_change_pct: priceChangePct,
            last_price_update: new Date().toISOString(),
          },
        })
        .eq("id", crop.id);

      updatedCrops.push(crop.name);
    }

    return new Response(
      JSON.stringify({
        message: "Market prices updated successfully",
        updated: updatedCrops.length,
        crops: updatedCrops,
        exchange_rate: usdThbRate,
        thai_price_index: thaiPriceIndex,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to update prices", message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
