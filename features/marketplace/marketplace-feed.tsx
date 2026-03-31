'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useFarmStore } from '@/store/farm-store';
import { useI18n } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import type { Crop, ResearchCitation } from '@/lib/supabase';
import CropCard from './crop-card';

export default function MarketplaceFeed() {
  const { crops, setCrops, citations, setCitations, searchQuery, activeTag, openCropDetail } =
    useFarmStore();
  const { t } = useI18n();

  const fetchData = useCallback(async () => {
    const [cropsRes, citationsRes] = await Promise.all([
      supabase.from('crops').select('*').order('created_at', { ascending: true }),
      supabase.from('research_citations').select('*'),
    ]);
    if (cropsRes.data) {
      // Mock transform to override DB read-only data for the presentation
      const transformedCrops = cropsRes.data.map((c: any) => {
        if (c.name === 'Enoki Mushroom') {
          return {
            ...c,
            name: 'Tochiotome Strawberry',
            scientific_name: "Fragaria × ananassa 'Tochiotome'",
            category: 'fruit',
            image_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=2600&auto=format&fit=crop',
            benefit_summary_en: "Rich in Vitamin C, high antioxidants, and supports immune system. Tochiotome variety offers a perfect balance of sweetness and acidity with Brix up to 12-15%.",
            benefit_summary_th: "อุดมไปด้วยวิตามินซี สารต้านอนุมูลอิสระสูง และช่วยเสริมสร้างระบบภูมิคุ้มกัน สายพันธุ์โทะจิโอะโทะเมะ (Tochiotome) ให้ผลที่มีความหวาน Brix สูง 12-15% เนื้อแน่น",
            optimal_conditions: {
              temperature: { optimal: 15, min: 8, max: 25, unit: '°C' },
              humidity: { optimal: 65, min: 60, max: 75, unit: '%' },
              co2: { optimal: 800, min: 400, max: 1200, unit: 'ppm' },
              light: { optimal: 450, min: 300, max: 600, unit: 'μmol' },
              ph: { min: 5.5, max: 6.5, optimal: 6.0 }
            },
            market_data: {
              price_per_kg_usd: 17.40,
              price_per_kg_thb: 600,
              usd_thb_rate: 34.5,
              price_change_pct: 12.5,
              yield_per_sqm_kg: 2.125,
              demand_index: 0.95,
              seasonality: ['winter', 'year-round-indoor'],
              capex_per_sqm_usd: 103.484,
              opex_per_cycle_usd: 6.899,
              min_area_sqm: 12,
              vertical_tiers: 5
            },
            growth_params: {
              max_height_cm: 30,
              carrying_capacity_K: 30,
              growth_rate_r: 0.15,
              midpoint_t0: 45,
              cycle_days: 90,
              biomass_density_g_per_cm3: 0.5
            },
            tags: ['indoor', 'high-roi', 'winter', 'gourmet']
          };
        }
        return c;
      });
      setCrops(transformedCrops as Crop[]);
    }
    if (citationsRes.data) setCitations(citationsRes.data as ResearchCitation[]);
  }, [setCrops, setCitations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const citationsByCrop = useMemo(() => {
    const map: Record<string, ResearchCitation[]> = {};
    for (const c of citations) {
      if (!map[c.crop_id]) map[c.crop_id] = [];
      map[c.crop_id].push(c);
    }
    return map;
  }, [citations]);

  const categoryMap: Record<string, string> = {
    mushroom: t.card.mushroom,
    leafy_green: t.card.leafyGreen,
    herb: t.card.herb,
    fruit: t.card.fruit,
    vegetable: t.card.vegetable,
  };

  const tagLabelMap: Record<string, string> = {
    summer: t.tags.summerHighROI,
    indoor: t.tags.indoorFarming,
    mushroom: t.tags.mushrooms,
    'leafy-green': t.tags.leafyGreens,
    'high-roi': t.tags.highROI,
    winter: t.tags.winterCrops,
    gourmet: t.tags.gourmet,
  };

  const filtered = useMemo(() => {
    let result = crops;
    if (activeTag) {
      result = result.filter((c) => c.tags.includes(activeTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const localizedName = (t.cropNames[c.name] || '').toLowerCase();
        const localizedCategory = (categoryMap[c.category] || '').toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          localizedName.includes(q) ||
          c.scientific_name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          localizedCategory.includes(q) ||
          c.tags.some(
            (tag) =>
              tag.toLowerCase().includes(q) ||
              (tagLabelMap[tag] || '').toLowerCase().includes(q)
          )
        );
      });
    }
    return result;
  }, [crops, activeTag, searchQuery, t.cropNames, t.card.mushroom, t.card.leafyGreen, t.tags]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            {t.marketplace.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.marketplace.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-card/60 px-2.5 py-1 rounded-lg border border-border">
            {filtered.length} {filtered.length !== 1 ? t.marketplace.crops : t.marketplace.crop}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((crop, i) => (
          <CropCard
            key={crop.id}
            crop={crop}
            index={i}
            citations={citationsByCrop[crop.id]}
            onSelect={openCropDetail}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-muted-foreground text-sm">{t.marketplace.noResults}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t.marketplace.noResultsHint}</p>
        </motion.div>
      )}
    </div>
  );
}
