'use client';

import { motion } from 'framer-motion';
import { Leaf, Activity, Scale } from 'lucide-react';
import type { GrowthState } from './growth-model';
import type { Crop } from '@/types/models';
import { useI18n } from '@/lib/i18n/i18n-context';

interface StatsOverlayProps {
  growthState: GrowthState;
  crop: Crop;
  day: number;
}

export default function StatsOverlay({ growthState, crop, day }: StatsOverlayProps) {
  const { t } = useI18n();

  const healthLabel = growthState.health >= 70
    ? t.stats.optimal
    : growthState.health >= 40
      ? t.stats.stressed
      : t.stats.critical;

  const stats = [
    {
      label: t.stats.height,
      value: `${growthState.height}${t.popover.unitCm}`,
      sub: `/${crop.growth_params.carrying_capacity_K}${t.popover.unitCm}`,
      icon: Activity,
      color: 'text-cyan-400',
      glow: 'shadow-cyan-500/20',
    },
    {
      label: t.stats.biomass,
      value: `${growthState.biomass}g`,
      sub: t.stats.perUnit,
      icon: Scale,
      color: 'text-teal-400',
      glow: 'shadow-teal-500/20',
    },
    {
      label: t.stats.health,
      value: `${growthState.health}%`,
      sub: healthLabel,
      icon: Leaf,
      color:
        growthState.health >= 70
          ? 'text-emerald-400'
          : growthState.health >= 40
            ? 'text-amber-400'
            : 'text-rose-400',
      glow:
        growthState.health >= 70
          ? 'shadow-emerald-500/20'
          : growthState.health >= 40
            ? 'shadow-amber-500/20'
            : 'shadow-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`relative p-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md shadow-lg ${stat.glow}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={12} className={stat.color} />
              <span className="text-xs text-white/70 uppercase tracking-wider font-medium">
                {stat.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-base font-bold font-mono ${stat.color}`}>{stat.value}</span>
              <span className="text-[11px] text-white/50 font-mono">{stat.sub}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
