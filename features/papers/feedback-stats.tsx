'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquareWarning,
  Clock,
  CircleCheck as CheckCircle,
  Brain,
  Ban,
} from 'lucide-react';
import type { PaperFeedback } from '@/lib/supabase';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';

interface FeedbackStatsProps {
  feedback: PaperFeedback[];
  onFilterChange: (status: string) => void;
}

export default function FeedbackStats({ feedback, onFilterChange }: FeedbackStatsProps) {
  const dt = useDashboardI18n();

  const counts = useMemo(() => ({
    total: feedback.length,
    pending: feedback.filter((f) => f.status === 'pending').length,
    ai_triaged: feedback.filter((f) => f.status === 'ai_triaged').length,
    reviewing: feedback.filter((f) => f.status === 'reviewing').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
    dismissed: feedback.filter((f) => f.status === 'dismissed').length,
  }), [feedback]);

  const openCount = counts.pending + counts.ai_triaged + counts.reviewing;

  const stats = [
    {
      key: 'all',
      label: dt.totalIssues,
      count: counts.total,
      icon: MessageSquareWarning,
      color: 'text-foreground/80',
      bg: 'bg-secondary/60 border-border hover:border-border',
      iconColor: 'text-muted-foreground',
    },
    {
      key: 'open',
      label: dt.open,
      count: openCount,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/8 border-amber-500/10 hover:border-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      key: 'ai_triaged',
      label: dt.aiTriaged,
      count: counts.ai_triaged,
      icon: Brain,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/8 border-cyan-500/10 hover:border-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
    {
      key: 'resolved',
      label: dt.resolved,
      count: counts.resolved,
      icon: CheckCircle,
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
            onClick={() => onFilterChange(stat.key)}
            className={`relative p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer group text-left ${stat.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-muted ${stat.iconColor}`}>
                <Icon size={14} />
              </div>
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
