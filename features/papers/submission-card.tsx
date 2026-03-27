'use client';

import { motion } from 'framer-motion';
import {
  Clock,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  TriangleAlert as AlertTriangle,
  Loader as Loader2,
  Eye,
  ExternalLink,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import type { PaperSubmission } from '@/lib/supabase';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';

interface SubmissionCardProps {
  submission: PaperSubmission;
  cropName: string;
  onSelect: (sub: PaperSubmission) => void;
  isSelected?: boolean;
  index: number;
}

export default function SubmissionCard({ submission, cropName, onSelect, isSelected, index }: SubmissionCardProps) {
  const dt = useDashboardI18n();

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string; step: number }> = {
    pending: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', label: dt.queued, step: 0 },
    analyzing: { icon: Brain, color: 'text-amber-400', bg: 'bg-amber-500/10', label: dt.aiResearching, step: 1 },
    review: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', label: dt.readyToReview, step: 2 },
    approved: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: dt.approved, step: 3 },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: dt.rejected, step: -1 },
    error: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', label: dt.error, step: -1 },
  };

  const pipelineSteps = [
    { label: dt.added, color: 'bg-muted-foreground' },
    { label: dt.ai, color: 'bg-amber-400' },
    { label: dt.review, color: 'bg-blue-400' },
    { label: dt.live, color: 'bg-emerald-400' },
  ];

  const config = statusConfig[submission.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const currentStep = config.step;

  const confidenceColor =
    submission.ai_confidence_score >= 80 ? 'text-emerald-400'
      : submission.ai_confidence_score >= 60 ? 'text-amber-400'
        : submission.ai_confidence_score > 0 ? 'text-red-400'
          : 'text-muted-foreground/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2 }}
      onClick={() => onSelect(submission)}
      className={`group relative p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected
          ? 'bg-teal-500/5 border-teal-500/20 shadow-sm shadow-teal-500/5'
          : 'bg-transparent border-transparent hover:bg-muted/50 hover:border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-1 sm:line-clamp-2">
            {submission.title || dt.untitledPaper}
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {submission.authors || dt.unknownAuthors}
            {submission.year ? ` \u00B7 ${submission.year}` : ''}
          </p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 ${config.bg} ${config.color}`}>
          <StatusIcon size={11} className={submission.status === 'analyzing' || submission.status === 'pending' ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{config.label}</span>
        </span>
      </div>

      {currentStep >= 0 && (
        <div className="flex items-center gap-0.5 mb-2.5">
          {pipelineSteps.map((step, i) => (
            <div key={step.label} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${
                i <= currentStep ? step.color : 'bg-border'
              }`} />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
            {cropName}
          </span>
          {submission.ai_confidence_score > 0 && (
            <span className={`text-[11px] font-mono font-medium ${confidenceColor}`}>
              {submission.ai_confidence_score}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {submission.ai_model_used && (
            <span className="text-[11px] text-muted-foreground/50 px-1.5 py-0.5 rounded bg-muted border border-border hidden sm:inline">
              {submission.ai_model_used.split('/')[0] || 'ai'}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
            {new Date(submission.created_at).toLocaleDateString()}
          </span>
          {submission.doi && (
            <a
              href={`https://doi.org/${submission.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[11px] text-teal-500 hover:text-teal-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              DOI <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
