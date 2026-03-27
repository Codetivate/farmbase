'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, TriangleAlert as AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

interface ConfidenceRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  delay?: number;
}

function useTier(score: number) {
  const { t } = useI18n();

  if (score >= 70) {
    return {
      label: t.card.highConfidence,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      barColor: 'from-emerald-500 to-emerald-400',
      icon: ShieldCheck,
      dotColor: 'bg-emerald-400',
    };
  }
  if (score >= 55) {
    return {
      label: t.card.moderateConfidence,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      barColor: 'from-teal-500 to-cyan-400',
      icon: TrendingUp,
      dotColor: 'bg-teal-400',
    };
  }
  return {
    label: t.card.lowConfidence,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    barColor: 'from-amber-500 to-orange-400',
    icon: AlertTriangle,
    dotColor: 'bg-amber-400',
  };
}

export default function ConfidenceRing({
  score,
  delay = 0,
}: ConfidenceRingProps) {
  const tier = useTier(score);
  const Icon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${tier.bg} ${tier.border} border backdrop-blur-sm`}
    >
      <Icon size={13} className={tier.color} />

      <div className="flex flex-col gap-0.5">
        <span className={`text-xs font-bold font-mono leading-none ${tier.color}`}>
          {score}%
        </span>
        <div className="w-12 h-[3px] rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${tier.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

interface ConfidenceBadgeInlineProps {
  score: number;
  citationCount: number;
  delay?: number;
}

export function ConfidenceBadgeInline({
  score,
  citationCount,
  delay = 0,
}: ConfidenceBadgeInlineProps) {
  const { t } = useI18n();
  const tier = useTier(score);
  const Icon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tier.bg} ${tier.border} border`}
    >
      <div className={`p-1.5 rounded-lg ${tier.bg} ${tier.border} border`}>
        <Icon size={13} className={tier.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t.card.aiConfidence}
          </span>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${tier.dotColor} animate-pulse`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${tier.color}`}>
              {tier.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 rounded-full bg-white/5 dark:bg-white/5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${tier.barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, delay: delay + 0.15, ease: 'easeOut' }}
            />
          </div>
          <span className={`text-xs font-bold font-mono leading-none ${tier.color}`}>
            {score}%
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className="text-xs font-bold font-mono text-muted-foreground">
          {citationCount}
        </span>
        <p className="text-[10px] text-muted-foreground/60">{t.card.studies}</p>
      </div>
    </motion.div>
  );
}
