'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Brain,
  CircleCheck as CheckCircle,
  Loader as Loader2,
  ShieldCheck,
  FileText,
  Eye,
  Pencil,
  Check,
  FlaskConical,
  Sparkles,
  Upload,
  Search,
} from 'lucide-react';
import { usePaperStore } from '@/store/paper-store';
import type { PaperSubmission, PaperAuditLog, ExtractedVariable } from '@/types/models';

function AuditTimeline({ logs }: { logs: PaperAuditLog[] }) {
  const actionColors: Record<string, string> = {
    submitted: 'bg-muted-foreground',
    analyzing: 'bg-amber-400',
    analyzed: 'bg-teal-400',
    ai_analyzed: 'bg-teal-400',
    approved: 'bg-emerald-400',
    rejected: 'bg-red-400',
    needs_revision: 'bg-amber-400',
    promoted: 'bg-teal-400',
    variable_corrected: 'bg-cyan-400',
    crop_published: 'bg-emerald-400',
    error: 'bg-orange-400',
  };

  return (
    <div className="space-y-0">
      {logs.map((log, i) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mt-1.5 ${actionColors[log.action] || 'bg-secondary'}`} />
            {i < logs.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>
          <div className="pb-3.5 flex-1">
            <p className="text-xs text-foreground font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {log.actor_email} &middot; {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <p className="text-xs text-muted-foreground/50 text-center py-6">No events yet</p>
      )}
    </div>
  );
}

interface VariableCardProps {
  variable: ExtractedVariable;
  corrected?: ExtractedVariable;
  onSave: (corrected: ExtractedVariable) => void;
}

function VariableCard({ variable, corrected, onSave }: VariableCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(corrected?.value || variable.value);
  const [editUnit, setEditUnit] = useState(corrected?.unit || variable.unit);

  const displayVar = corrected || variable;
  const isCorrected = !!corrected;

  const confidenceColor =
    variable.confidence >= 0.8 ? 'text-emerald-400'
      : variable.confidence >= 0.6 ? 'text-amber-400'
        : 'text-red-400';

  const confidenceBg =
    variable.confidence >= 0.8 ? 'bg-emerald-500/10'
      : variable.confidence >= 0.6 ? 'bg-amber-500/10'
        : 'bg-red-500/10';

  const handleSave = () => {
    onSave({
      ...variable,
      value: editValue,
      unit: editUnit,
    });
    setEditing(false);
  };

  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isCorrected
        ? 'bg-cyan-500/5 border-cyan-500/15'
        : 'bg-muted/50 border-border'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{variable.label}</p>
          {isCorrected && (
            <span className="text-[11px] text-cyan-400 font-medium">Admin corrected</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-md ${confidenceBg} ${confidenceColor}`}>
            {Math.round(variable.confidence * 100)}%
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground font-mono focus:outline-none focus:border-teal-500/40"
            autoFocus
          />
          <input
            type="text"
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
            className="w-16 px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground/80 font-mono focus:outline-none focus:border-teal-500/40"
          />
          <button
            onClick={handleSave}
            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
          >
            <Check size={13} />
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditValue(corrected?.value || variable.value);
              setEditUnit(corrected?.unit || variable.unit);
            }}
            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold font-mono text-foreground">{displayVar.value}</span>
          <span className="text-xs text-muted-foreground font-mono">{displayVar.unit}</span>
        </div>
      )}
    </div>
  );
}

const sourceTypeIcons: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  deep_search: { icon: Search, color: 'text-amber-400', label: 'Deep Search' },
  doi: { icon: FlaskConical, color: 'text-teal-400', label: 'DOI Import' },
  url: { icon: ExternalLink, color: 'text-teal-400', label: 'URL Import' },
  upload: { icon: Upload, color: 'text-cyan-400', label: 'File Upload' },
};

interface ReviewPanelProps {
  submission: PaperSubmission;
  onClose: () => void;
  cropName: string;
}

export default function ReviewPanel({ submission, onClose, cropName }: ReviewPanelProps) {
  const {
    reviews,
    auditLog,
    fetchReviews,
    fetchAuditLog,
    submitReview,
    promoteToResearchCitation,
    updateVariable,
    publishApprovedCrop,
  } = usePaperStore();

  const [tab, setTab] = useState<'summary' | 'variables' | 'review' | 'history'>('summary');
  const [reviewEmail, setReviewEmail] = useState('');
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [savingVar, setSavingVar] = useState(false);

  useEffect(() => {
    fetchReviews(submission.id);
    fetchAuditLog(submission.id);
  }, [submission.id]);

  const handleReview = async () => {
    if (!reviewEmail || !decision) return;
    setSubmittingReview(true);
    await submitReview({
      submission_id: submission.id,
      reviewer_email: reviewEmail,
      decision,
      reviewer_notes: notes,
      confidence_adjustment: 0,
      data_accuracy: 'accurate',
    });
    setSubmittingReview(false);
    setDecision('');
    setNotes('');
  };

  const handlePromote = async () => {
    setPromoting(true);
    await promoteToResearchCitation(submission.id);
    setPromoting(false);
  };

  const handleVariableSave = async (variableKey: string, corrected: ExtractedVariable) => {
    setSavingVar(true);
    await updateVariable(submission.id, variableKey, corrected);
    setSavingVar(false);
  };

  const variables = submission.ai_extracted_variables || {};
  const corrections = submission.admin_corrected_variables || {};
  const variableEntries = Object.entries(variables);
  const hasVariables = variableEntries.length > 0;

  const confidenceColor =
    submission.ai_confidence_score >= 80 ? 'text-emerald-400'
      : submission.ai_confidence_score >= 60 ? 'text-amber-400'
        : 'text-red-400';

  const isAnalyzing = submission.status === 'analyzing' || submission.status === 'pending';
  const canReview = submission.status === 'review' || submission.status === 'approved';
  const canPromote = submission.status === 'approved';

  const sourceInfo = sourceTypeIcons[submission.source_type] || sourceTypeIcons.doi;
  const SourceIcon = sourceInfo.icon;

  const tabs = [
    { key: 'summary' as const, label: 'AI Research', icon: Brain },
    { key: 'variables' as const, label: `Data${hasVariables ? ` (${variableEntries.length})` : ''}`, icon: FlaskConical },
    { key: 'review' as const, label: `Review${reviews.length > 0 ? ` (${reviews.length})` : ''}`, icon: Eye },
    { key: 'history' as const, label: 'Timeline', icon: FileText },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {submission.title || 'Untitled'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {submission.authors} {submission.year ? `\u00B7 ${submission.year}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{cropName}</span>
            <span className={`flex items-center gap-1 text-xs ${sourceInfo.color} bg-muted px-2 py-0.5 rounded-md`}>
              <SourceIcon size={10} />
              {sourceInfo.label}
            </span>
            {submission.doi && (
              <a
                href={`https://doi.org/${submission.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-teal-500 hover:text-teal-400"
              >
                DOI <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex border-b border-border shrink-0 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors relative whitespace-nowrap min-w-0 px-2 ${
                tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{t.label}</span>
              {tab === t.key && (
                <motion.div layoutId="review-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'summary' && (
          <>
            {isAnalyzing && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <Loader2 size={18} className="text-amber-400 animate-spin shrink-0" />
                <div>
                  <p className="text-xs text-amber-400 font-medium">AI is researching this paper...</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">This may take a moment. Results will appear here.</p>
                </div>
              </div>
            )}

            {!isAnalyzing && submission.ai_confidence_score > 0 && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                <div className="text-center">
                  <span className={`text-3xl font-bold font-mono ${confidenceColor}`}>
                    {submission.ai_confidence_score}%
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">AI Confidence</p>
                </div>
                <div className="flex-1 text-[11px] text-muted-foreground space-y-0.5">
                  <p>Model: {submission.ai_model_used || 'N/A'}</p>
                  <p className="capitalize">Status: {submission.status}</p>
                  {hasVariables && (
                    <p>{variableEntries.length} variables extracted</p>
                  )}
                </div>
              </div>
            )}

            {submission.ai_summary && (
              <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Brain size={13} className="text-teal-400" />
                  <span className="text-[11px] font-semibold text-teal-400">AI Research Summary</span>
                </div>
                <p className="text-[12px] text-foreground leading-relaxed">{submission.ai_summary}</p>
              </div>
            )}

            {submission.abstract_text && (
              <div className="p-4 rounded-xl bg-muted/40">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <FileText size={13} className="text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground">Original Abstract</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{submission.abstract_text}</p>
              </div>
            )}

            {submission.ai_relevance_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {submission.ai_relevance_tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-lg text-[11px] bg-teal-500/10 text-teal-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {submission.error_message && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/10">
                <p className="text-xs text-red-400">{submission.error_message}</p>
              </div>
            )}

            {canReview && (
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-[11px] text-muted-foreground font-medium">Quick Actions</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setTab('review'); setDecision('approved'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/15 transition-all active:scale-[0.98]"
                  >
                    <CheckCircle size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => { setTab('review'); setDecision('rejected'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium bg-muted text-muted-foreground hover:bg-secondary border border-border transition-all active:scale-[0.98]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {canPromote && (
              <button
                onClick={handlePromote}
                disabled={promoting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-semibold bg-teal-500 hover:bg-teal-400 text-white transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {promoting ? (
                  <><Loader2 size={14} className="animate-spin" /> Publishing...</>
                ) : (
                  <><ShieldCheck size={14} /> Publish to Research</>
                )}
              </button>
            )}
          </>
        )}

        {tab === 'variables' && (
          <>
            {hasVariables ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-teal-400" />
                    <span className="text-[11px] font-semibold text-foreground/80">AI-Extracted Variables</span>
                  </div>
                  {savingVar && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400">
                      <Loader2 size={10} className="animate-spin" /> Saving...
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  {variableEntries.map(([key, variable]) => (
                    <VariableCard
                      key={key}
                      variable={variable}
                      corrected={corrections[key]}
                      onSave={(corrected) => handleVariableSave(key, corrected)}
                    />
                  ))}
                </div>

                {Object.keys(corrections).length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                    <CheckCircle size={13} className="text-cyan-400 shrink-0" />
                    <p className="text-[11px] text-cyan-400">
                      {Object.keys(corrections).length} variable{Object.keys(corrections).length !== 1 ? 's' : ''} corrected by admin
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <FlaskConical size={24} className="text-border mx-auto mb-3" />
                <p className="text-xs text-muted-foreground/50">No extracted variables yet</p>
                <p className="text-[11px] text-border mt-1">
                  {isAnalyzing ? 'AI is still analyzing...' : 'Variables will appear after AI analysis'}
                </p>
              </div>
            )}
          </>
        )}

        {tab === 'review' && (
          <>
            {reviews.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-[11px] text-muted-foreground font-medium">Review History</p>
                {reviews.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground/80 truncate">{r.reviewer_email}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium shrink-0 ${
                        r.decision === 'approved' ? 'bg-emerald-500/10 text-emerald-400'
                          : r.decision === 'rejected' ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {r.decision}
                      </span>
                    </div>
                    {r.reviewer_notes && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{r.reviewer_notes}</p>
                    )}
                    {r.reviewed_at && (
                      <p className="text-[11px] text-muted-foreground/50">{new Date(r.reviewed_at).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canReview && (
              <div className="p-4 rounded-xl bg-muted/40 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Your Review</h4>

                <input
                  type="email"
                  value={reviewEmail}
                  onChange={(e) => setReviewEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/40"
                />

                <div className="flex gap-2">
                  {[
                    { key: 'approved', label: 'Approve', active: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' },
                    { key: 'needs_revision', label: 'Revise', active: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' },
                    { key: 'rejected', label: 'Reject', active: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' },
                  ].map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setDecision(d.key)}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                        decision === d.key ? d.active : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes (optional)..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/40 resize-none"
                />

                <button
                  onClick={handleReview}
                  disabled={!reviewEmail || !decision || submittingReview}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20 active:scale-[0.98]"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            )}

            {!canReview && reviews.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Paper needs AI analysis before review</p>
            )}
          </>
        )}

        {tab === 'history' && (
          <AuditTimeline logs={auditLog} />
        )}
      </div>
    </div>
  );
}
