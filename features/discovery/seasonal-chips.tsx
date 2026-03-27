'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useFarmStore } from '@/store/farm-store';
import { useI18n } from '@/lib/i18n/i18n-context';
import {
  Sun,
  TrendingUp,
  Zap,
  Sprout,
  Warehouse,
  Leaf,
  Snowflake,
  Flame,
} from 'lucide-react';
import type { Translations } from '@/lib/i18n/translations';

function getTagData(t: Translations['tags']) {
  return [
    { label: t.summerHighROI, value: 'summer', icon: Sun, color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-600 dark:text-amber-300' },
    { label: t.quickHarvest, value: 'indoor', icon: Zap, color: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30 text-cyan-600 dark:text-cyan-300' },
    { label: t.mushrooms, value: 'mushroom', icon: Sprout, color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-600 dark:text-teal-300' },
    { label: t.leafyGreens, value: 'leafy-green', icon: Leaf, color: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-600 dark:text-green-300' },
    { label: t.highROI, value: 'high-roi', icon: TrendingUp, color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' },
    { label: t.indoorFarming, value: 'indoor', icon: Warehouse, color: 'from-gray-500/20 to-zinc-500/20 border-gray-500/30 text-gray-600 dark:text-gray-300' },
    { label: t.winterCrops, value: 'winter', icon: Snowflake, color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/30 text-sky-600 dark:text-sky-300' },
    { label: t.gourmet, value: 'gourmet', icon: Flame, color: 'from-rose-500/20 to-orange-500/20 border-rose-500/30 text-rose-600 dark:text-rose-300' },
  ];
}

export default function SeasonalChips() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeTag, setActiveTag } = useFarmStore();
  const { t } = useI18n();

  const tags = getTagData(t.tags);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tags.map((tag, i) => {
          const Icon = tag.icon;
          const active = activeTag === tag.value;
          return (
            <motion.button
              key={`${tag.value}-${tag.label}`}
              onClick={() => setActiveTag(active ? null : tag.value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-medium whitespace-nowrap transition-all duration-200 bg-gradient-to-r ${
                active
                  ? `${tag.color} shadow-lg`
                  : 'from-secondary/60 to-secondary/40 border-border text-muted-foreground hover:border-ring/30 hover:text-foreground'
              }`}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.04,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
            >
              <Icon size={13} />
              <span>#{tag.label}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="absolute right-0 top-0 bottom-1 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
