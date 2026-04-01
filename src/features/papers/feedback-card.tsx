'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CircleCheck as CheckCircle,
  Brain,
  ChevronDown,
  ChevronUp,
  Ban,
  Send,
  Loader as Loader2,
  TriangleAlert as AlertTriangle,
  MessageSquareWarning,
  ArrowRight,
  User,
  FileText,
  Shield,
} from 'lucide-react';
import type { PaperFeedback } from '@/types/models';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';

interface FeedbackCardProps {
  item: PaperFeedback;
  paperTitle?: string;
  index: number;
  onResolve: (id: string, email: string, notes: string) => Promise<boolean>;
  onDismiss: (id: string, email: string, notes: string) => Promise<boolean>;
}

export default function FeedbackCard({ item, paperTitle, index, onResolve, onDismiss }: FeedbackCardProps) {
  const dt = useDashboardI18n();
  const [expanded, setExpanded] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveEmail, setResolveEmail] = useState('');
  const [acting, setActing] = useState(false);
  const [actionMode, setActionMode] = useState<'resolve' | 'dismiss' | null>(null);

  const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
    low: { color: 'text-muted-foreground', bg: 'bg-secondary border-border', label: dt.low },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15', label: dt.medium },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/15', label: dt.high },
    critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15', label: dt.critical },
  };

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: dt.pending },
    ai_triaged: { icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', label: dt.aiTriaged },
    reviewing: { icon: MessageSquareWarning, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: dt.reviewing },
    resolved: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: dt.resolved },
    dismissed: { icon: Ban, color: 'text-muted-foreground', bg: 'bg-secondary border-border', label: dt.dismissed },
  };

  const feedbackTypeLabels: Record<string, string> = {
    data_error: dt.dataError,
    missing_info: dt.missingInfo,
    wrong_crop: dt.wrongCrop,
    confidence_too_high: dt.confidenceTooHigh,
    confidence_too_low: dt.confidenceTooLow,
    outdated: dt.outdated,
    other: dt.other,
  };

  const severity = severityConfig[item.severity] || severityConfig.medium;
  const status = statusConfig[item.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isOpen = item.status === 'pending' || item.status === 'ai_triaged' || item.status === 'reviewing';

  const handleAction = async (mode: 'resolve' | 'dismiss') => {
    if (!resolveEmail) return;
    setActing(true);
    const fn = mode === 'resolve' ? onResolve : onDismiss;
    await fn(item.id, resolveEmail, resolveNotes);
    setActing(false);
    setActionMode(null);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}${dt.mAgo}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${dt.hAgo}`;
    const days = Math.floor(hours / 24);
    return `${days}${dt.dAgo}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2 }}
      className={`rounded-xl border transition-all ${
        isOpen
          ? 'bg-card border-border hover:border-ring/30'
          : 'bg-muted/30 border-border/50 opacity-75 hover:opacity-100'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 sm:p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${severity.bg}`}>
            <AlertTriangle size={12} className={severity.color} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-1.5 py-0.5 rounded-md border text-[11px] font-semibold ${status.bg} ${status.color}`}>
                    <StatusIcon size={8} className="inline mr-0.5 -mt-px" />
                    {status.label}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md border text-[11px] font-medium ${severity.bg} ${severity.color}`}>
                    {severity.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-muted border border-border text-[11px] text-muted-foreground">
                    {feedbackTypeLabels[item.feedback_type] || item.feedback_type}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                  {item.feedback_notes}
                </p>
              </div>
              <div className="shrink-0 ml-2">
                {expanded ? (
                  <ChevronUp size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User size={9} />
                {item.reporter_email}
              </span>
              <span className="text-border">|</span>
              <span>{timeAgo(item.created_at)}</span>
              {item.field_name && (
                <>
                  <span className="text-border">|</span>
                  <span className="font-mono text-muted-foreground">
                    {item.field_name}
                  </span>
                </>
              )}
              {paperTitle && (
                <>
                  <span className="text-border hidden sm:block">|</span>
                  <span className="hidden sm:flex items-center gap-1 truncate max-w-[200px]">
                    <FileText size={8} />
                    {paperTitle}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 ml-9">
              {item.original_value && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[11px] text-red-400/60 font-medium uppercase tracking-wider mb-1">{dt.currentValue}</p>
                    <p className="text-[11px] text-red-300 font-mono">{item.original_value}</p>
                  </div>
                  {item.suggested_value && (
                    <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <p className="text-[11px] text-emerald-400/60 font-medium uppercase tracking-wider mb-1">{dt.suggested}</p>
                      <p className="text-[11px] text-emerald-300 font-mono">{item.suggested_value}</p>
                    </div>
                  )}
                </div>
              )}

              {item.ai_analysis && (
                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Brain size={11} className="text-cyan-400" />
                    <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">{dt.aiAnalysis}</span>
                    {item.ai_confidence > 0 && (
                      <span className="text-[11px] font-mono text-cyan-300 ml-auto">{Math.round(item.ai_confidence * 100)}% {dt.confidence}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{item.ai_analysis}</p>
                  {item.ai_recommendation && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <ArrowRight size={9} className="text-cyan-500" />
                      <span className="text-[11px] font-medium text-cyan-400">
                        {dt.recommendation}: {item.ai_recommendation.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {item.resolved_at && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield size={10} className="text-emerald-400" />
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      {item.status === 'dismissed' ? dt.dismissed : dt.resolved}
                    </span>
                    <span className="text-[11px] text-muted-foreground/50 ml-auto">
                      {new Date(item.resolved_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.resolution_notes || dt.noNotes}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-1">{dt.by} {item.resolved_by_email}</p>
                </div>
              )}

              {isOpen && !actionMode && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setActionMode('resolve')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    <CheckCircle size={12} />
                    {dt.resolve}
                  </button>
                  <button
                    onClick={() => setActionMode('dismiss')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-muted text-muted-foreground border border-border hover:bg-secondary transition-all active:scale-[0.98]"
                  >
                    <Ban size={12} />
                    {dt.dismiss}
                  </button>
                </div>
              )}

              <AnimatePresence>
                {actionMode && isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`p-3 rounded-xl border space-y-2.5 ${
                      actionMode === 'resolve'
                        ? 'bg-emerald-500/5 border-emerald-500/15'
                        : 'bg-secondary/40 border-border'
                    }`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                        actionMode === 'resolve' ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {actionMode === 'resolve' ? dt.resolveIssue : dt.dismissIssue}
                      </p>
                      <input
                        type="email"
                        value={resolveEmail}
                        onChange={(e) => setResolveEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/40"
                      />
                      <textarea
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        placeholder={actionMode === 'resolve' ? dt.howResolved : dt.reasonForDismissal}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/40 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(actionMode)}
                          disabled={!resolveEmail || acting}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 active:scale-[0.97] ${
                            actionMode === 'resolve'
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-secondary hover:bg-secondary text-white'
                          }`}
                        >
                          {acting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                          {actionMode === 'resolve' ? dt.confirmResolution : dt.confirmDismiss}
                        </button>
                        <button
                          onClick={() => setActionMode(null)}
                          className="px-3 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground bg-muted hover:bg-muted transition-all"
                        >
                          {dt.cancel}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
