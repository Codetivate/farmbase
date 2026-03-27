'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  MessageSquareWarning,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { usePaperStore } from '@/store/paper-store';
import { useFarmStore } from '@/store/farm-store';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';
import FeedbackStats from './feedback-stats';
import FeedbackCard from './feedback-card';

export default function FeedbackDashboard() {
  const { feedback, feedbackLoading, fetchFeedback, resolveFeedback, dismissFeedback, submissions } = usePaperStore();
  const { crops } = useFarmStore();
  const dt = useDashboardI18n();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const submissionTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of submissions) map[s.id] = s.title || dt.untitledPaper;
    return map;
  }, [submissions, dt.untitledPaper]);

  const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  const filtered = useMemo(() => {
    let result = feedback;

    if (filterStatus === 'open') {
      result = result.filter((f) => f.status === 'pending' || f.status === 'ai_triaged' || f.status === 'reviewing');
    } else if (filterStatus !== 'all') {
      result = result.filter((f) => f.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.feedback_notes?.toLowerCase().includes(q) ||
          f.reporter_email?.toLowerCase().includes(q) ||
          f.field_name?.toLowerCase().includes(q) ||
          f.feedback_type?.toLowerCase().includes(q) ||
          (submissionTitleMap[f.submission_id] || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'severity') {
      result = [...result].sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));
    }

    return result;
  }, [feedback, filterStatus, searchQuery, sortBy, submissionTitleMap]);

  const sortLabels: Record<string, string> = {
    newest: dt.newest,
    oldest: dt.oldest,
    severity: dt.severity,
  };

  const statusFilterItems = [
    { key: 'all', label: dt.all },
    { key: 'open', label: dt.open },
    { key: 'ai_triaged', label: dt.aiTriaged },
    { key: 'reviewing', label: dt.reviewing },
    { key: 'resolved', label: dt.resolved },
    { key: 'dismissed', label: dt.dismissed },
  ];

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{dt.issueTracker}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            {dt.issueTrackerDesc}
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          disabled={feedbackLoading}
          className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={14} className={feedbackLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <FeedbackStats feedback={feedback} onFilterChange={setFilterStatus} />

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dt.searchIssues}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/30 transition-colors"
            />
          </div>

          <button
            onClick={() => {
              const next = sortBy === 'newest' ? 'severity' : sortBy === 'severity' ? 'oldest' : 'newest';
              setSortBy(next);
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowUpDown size={12} />
            <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
            {statusFilterItems.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  filterStatus === f.key
                    ? 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {feedback.length > 0 && (
            <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap shrink-0">
              {filtered.length === feedback.length
                ? `${feedback.length} ${dt.issues}`
                : `${filtered.length} ${dt.issuesOf} ${feedback.length}`}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 max-h-[calc(100vh-480px)] sm:max-h-[calc(100vh-440px)] overflow-y-auto pr-1 scrollbar-hide">
        {filtered.map((item, i) => (
          <FeedbackCard
            key={item.id}
            item={item}
            paperTitle={submissionTitleMap[item.submission_id]}
            index={i}
            onResolve={resolveFeedback}
            onDismiss={dismissFeedback}
          />
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <MessageSquareWarning size={32} className="text-border mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">{dt.noIssuesFound}</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {feedback.length === 0
                ? dt.issuesWillAppear
                : dt.adjustFilters
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
