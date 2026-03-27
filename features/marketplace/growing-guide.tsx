'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CircleCheck as CheckCircle2, Circle, Sprout, Thermometer, Eye, Scissors, RefreshCw } from 'lucide-react';
import type { Crop } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Translations } from '@/lib/i18n/translations';

interface GrowingStep {
  title: string;
  description: string;
  day: string;
  icon: React.ElementType;
}

function generateSteps(crop: Crop, t: Translations['guide'], dayLabel: string, unitKg: string, unitSqm: string): GrowingStep[] {
  const gp = crop.growth_params;
  const yieldStr = `${crop.market_data.yield_per_sqm_kg} ${unitKg}/${unitSqm}`;
  const d = (range: string) => `${dayLabel} ${range}`;

  if (crop.category === 'mushroom') {
    return [
      {
        title: t.prepareSubstrate,
        description: t.prepareSubstrateDesc,
        day: d('1-2'),
        icon: Sprout,
      },
      {
        title: t.inoculateIncubate,
        description: t.inoculateIncubateDesc,
        day: d(`3-${Math.round(gp.midpoint_t0 * 0.6)}`),
        icon: Thermometer,
      },
      {
        title: t.initiateFruiting,
        description: t.initiatefruitingDesc,
        day: d(`${Math.round(gp.midpoint_t0 * 0.6) + 1}`),
        icon: Thermometer,
      },
      {
        title: t.monitorGrowth,
        description: t.monitorGrowthDesc,
        day: d(`${Math.round(gp.midpoint_t0 * 0.6) + 2}-${gp.cycle_days - 3}`),
        icon: Eye,
      },
      {
        title: t.harvest,
        description: `${t.harvestMushroomDesc} ${yieldStr}`,
        day: d(`${gp.cycle_days - 2}-${gp.cycle_days}`),
        icon: Scissors,
      },
    ];
  }

  return [
    {
      title: t.startSeeds,
      description: t.startSeedsDesc,
      day: d('1-7'),
      icon: Sprout,
    },
    {
      title: t.transplantSeedlings,
      description: t.transplantSeedlingsDesc,
      day: d('14-21'),
      icon: Sprout,
    },
    {
      title: t.optimizeEnvironment,
      description: t.optimizeEnvironmentDesc,
      day: d(`21-${Math.round(gp.midpoint_t0)}`),
      icon: Thermometer,
    },
    {
      title: t.headFormation,
      description: t.headFormationDesc,
      day: d(`${Math.round(gp.midpoint_t0)}-${gp.cycle_days - 10}`),
      icon: Eye,
    },
    {
      title: t.harvest,
      description: `${t.harvestVegetableDesc} ${yieldStr}`,
      day: d(`${gp.cycle_days - 5}-${gp.cycle_days}`),
      icon: Scissors,
    },
    {
      title: t.postHarvest,
      description: t.postHarvestDesc,
      day: d(`${gp.cycle_days}+`),
      icon: RefreshCw,
    },
  ];
}

interface GrowingGuideProps {
  crop: Crop;
  currentDay: number;
}

export default function GrowingGuide({ crop, currentDay }: GrowingGuideProps) {
  const { t } = useI18n();
  const steps = useMemo(
    () => generateSteps(crop, t.guide, t.detail.day, t.popover.unitKg, t.popover.unitSqm),
    [crop, t.guide, t.detail.day, t.popover.unitKg, t.popover.unitSqm]
  );

  function getStepStatus(step: GrowingStep, index: number): 'completed' | 'current' | 'upcoming' {
    const dayMatch = step.day.match(/(\d+)/);
    const stepStartDay = dayMatch ? parseInt(dayMatch[1]) : 0;
    const nextStep = steps[index + 1];
    const nextDayMatch = nextStep?.day.match(/(\d+)/);
    const nextStartDay = nextDayMatch ? parseInt(nextDayMatch[1]) : crop.growth_params.cycle_days + 1;

    if (currentDay >= nextStartDay) return 'completed';
    if (currentDay >= stepStartDay) return 'current';
    return 'upcoming';
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const status = getStepStatus(step, i);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`relative flex gap-3 p-3 rounded-xl transition-all duration-300 ${
              status === 'current'
                ? 'bg-cyan-500/8 border border-cyan-500/20'
                : status === 'completed'
                  ? 'opacity-70'
                  : 'opacity-50'
            }`}
          >
            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
              {status === 'completed' ? (
                <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
              ) : status === 'current' ? (
                <div className="relative">
                  <Circle size={18} className="text-cyan-500 dark:text-cyan-400" />
                  <div className="absolute inset-1 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                </div>
              ) : (
                <Circle size={18} className="text-muted-foreground/40" />
              )}
              {i < steps.length - 1 && (
                <div className={`w-px flex-1 min-h-[20px] ${status === 'completed' ? 'bg-emerald-500/30' : 'bg-border'}`} />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className={`text-sm font-semibold ${status === 'current' ? 'text-cyan-600 dark:text-cyan-300' : 'text-foreground/80'}`}>
                  {step.title}
                </h4>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 bg-secondary px-1.5 py-0.5 rounded">
                  {step.day}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
