'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Eye,
  ShieldCheck,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';

interface PipelineStatsProps {
  submissions: { status: string }[];
  onFilterChange?: (status: string) => void;
}

export default function PipelineStats({ submissions, onFilterChange }: PipelineStatsProps) {
  const dt = useDashboardI18n();

  const counts = useMemo(() => ({
    total: submissions.length,
    analyzing: submissions.filter((s) => s.status === 'analyzing' || s.status === 'pending').length,
    review: submissions.filter((s) => s.status === 'review').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }), [submissions]);

  const stats = [
    {
      key: 'all',
      label: dt.totalPapers,
      count: counts.total,
      icon: FileText,
      color: 'text-foreground/80',
      bg: 'bg-secondary/60 border-border hover:border-border',
      iconColor: 'text-muted-foreground',
    },
    {
      key: 'analyzing',
      label: dt.aiResearching,
      count: counts.analyzing,
      icon: Brain,
      color: 'text-amber-400',
      bg: 'bg-amber-500/8 border-amber-500/10 hover:border-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      key: 'review',
      label: dt.readyToReview,
      count: counts.review,
      icon: Eye,
      color: 'text-blue-400',
      bg: 'bg-blue-500/8 border-blue-500/10 hover:border-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      key: 'approved',
      label: dt.approved,
      count: counts.approved,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/8 border-emerald-500/10 hover:border-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.button
            key={stat.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onFilterChange?.(stat.key)}
            className={`relative p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer group text-left ${stat.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-muted ${stat.iconColor}`}>
                <Icon size={14} />
              </div>
              {i > 0 && i < stats.length && (
                <ArrowRight size={10} className="text-border hidden sm:block absolute -left-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <p className={`text-xl sm:text-2xl font-bold font-mono ${stat.color}`}>
              {stat.count}
            </p>
            <p className="text-[11px] sm:text-[11px] text-muted-foreground mt-0.5 group-hover:text-muted-foreground transition-colors">
              {stat.label}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
