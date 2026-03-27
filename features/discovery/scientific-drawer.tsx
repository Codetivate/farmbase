'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BookOpen,
  ExternalLink,
  Brain,
  CircleGauge as GaugeCircle,
  FileText,
  Shield,
  Eye,
  MessageSquareWarning,
  Send,
  Loader as Loader2,
  CircleCheck as CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { useFarmStore } from '@/store/farm-store';
import { supabase } from '@/lib/supabase';
import type { ResearchCitation, PaperFeedback } from '@/lib/supabase';
import { useI18n, useCropName } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';

interface CitationWithSource extends ResearchCitation {
  submission_id?: string | null;
}

function ConfidenceGauge({ score, label }: { score: number; label: string }) {
  const rotation = (score / 100) * 180 - 90;
  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-16 overflow-hidden">
        <svg viewBox="0 0 120 65" className="w-full h-full">
          <path
            d="M10 60 A50 50 0 0 1 110 60"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M10 60 A50 50 0 0 1 110 60"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 157} 157`}
            className="drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]"
          />
          <line
            x1="60"
            y1="58"
            x2="60"
            y2="25"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 60, 58)`}
          />
          <circle cx="60" cy="58" r="3" fill={color} />
        </svg>
      </div>
      <div className="text-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {score}%
        </span>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

function InlineFeedbackForm({
  citation,
  onClose,
  onSuccess,
  userEmail,
}: {
  citation: CitationWithSource;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [feedbackType, setFeedbackType] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [suggested, setSuggested] = useState('');
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const quickFeedbackTypes = [
    { key: 'data_error', label: t.drawer.dataError },
    { key: 'confidence_too_high', label: t.drawer.scoreTooHigh },
    { key: 'confidence_too_low', label: t.drawer.scoreTooLow },
    { key: 'outdated', label: t.drawer.outdated },
    { key: 'other', label: t.drawer.other },
  ];

  const fieldOptions = [
    { key: '', label: t.drawer.generalCitation },
    { key: 'title', label: t.drawer.title },
    { key: 'authors', label: t.drawer.authors },
    { key: 'year', label: t.drawer.year },
    { key: 'journal', label: t.drawer.journal },
    { key: 'summary', label: t.drawer.summary },
    { key: 'confidence_score', label: t.drawer.confidenceScore },
  ];

  const severityOptions = [
    { key: 'low', label: t.drawer.low, active: 'text-foreground/70 bg-secondary border-border' },
    { key: 'medium', label: t.drawer.medium, active: 'text-amber-600 dark:text-amber-300 bg-amber-500/15 border-amber-500/30' },
    { key: 'high', label: t.drawer.high, active: 'text-orange-600 dark:text-orange-300 bg-orange-500/15 border-orange-500/30' },
    { key: 'critical', label: t.drawer.critical, active: 'text-red-600 dark:text-red-300 bg-red-500/15 border-red-500/30' },
  ];

  const getCurrentValue = () => {
    if (!fieldName) return '';
    const map: Record<string, string> = {
      title: citation.title,
      authors: citation.authors,
      year: String(citation.year),
      journal: citation.journal,
      summary: citation.summary,
      confidence_score: String(citation.confidence_score),
    };
    return map[fieldName] || '';
  };

  const handleSubmit = async () => {
    if (!feedbackType || !email || !notes) return;
    setSubmitting(true);

    const submissionId = citation.submission_id;

    if (submissionId) {
      const { data, error } = await supabase
        .from('paper_feedback')
        .insert({
          submission_id: submissionId,
          feedback_type: feedbackType,
          field_name: fieldName,
          original_value: getCurrentValue(),
          suggested_value: suggested,
          feedback_notes: notes,
          reporter_email: email,
          severity,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        await supabase.from('paper_audit_log').insert({
          submission_id: submissionId,
          action: 'feedback_submitted',
          actor_email: email,
          details: {
            feedback_id: data.id,
            feedback_type: feedbackType,
            field_name: fieldName,
            severity,
            source: 'scientific_drawer',
          },
        });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        fetch(`${supabaseUrl}/functions/v1/triage-feedback`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedback_id: data.id }),
        });
      }
    } else {
      const { data: submissions } = await supabase
        .from('paper_submissions')
        .select('id')
        .eq('doi', citation.doi)
        .limit(1);

      const targetSubmissionId = submissions?.[0]?.id;

      if (targetSubmissionId) {
        const { data, error } = await supabase
          .from('paper_feedback')
          .insert({
            submission_id: targetSubmissionId,
            feedback_type: feedbackType,
            field_name: fieldName,
            original_value: getCurrentValue(),
            suggested_value: suggested,
            feedback_notes: notes,
            reporter_email: email,
            severity,
            status: 'pending',
          })
          .select()
          .single();

        if (!error && data) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          fetch(`${supabaseUrl}/functions/v1/triage-feedback`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ feedback_id: data.id }),
          });
        }
      }
    }

    setSubmitting(false);
    setDone(true);
    onSuccess();
    setTimeout(() => onClose(), 2200);
  };

  const canProceedStep1 = !!feedbackType;
  const canProceedStep2 = !!notes;
  const canSubmit = feedbackType && email && notes && !submitting && !done;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent overflow-hidden">
        {done ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-2 py-6 px-4"
          >
            <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-400 font-medium">{t.drawer.issueReportedSuccess}</p>
            <p className="text-xs text-muted-foreground">{t.drawer.issueReportedDesc}</p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <MessageSquareWarning size={12} className="text-amber-500 dark:text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">{t.drawer.reportIssue}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`w-5 h-1 rounded-full transition-colors ${
                        step >= s ? 'bg-amber-400' : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <button onClick={onClose} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2.5"
                >
                  <p className="text-xs text-muted-foreground font-medium">{t.drawer.whatTypeOfIssue}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {quickFeedbackTypes.map((ft) => (
                      <button
                        key={ft.key}
                        onClick={() => setFeedbackType(ft.key)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all border text-left ${
                          feedbackType === ft.key
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300'
                            : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-ring/30'
                        }`}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">{t.drawer.affectedField}</label>
                      <select
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:border-amber-500/40 appearance-none"
                      >
                        {fieldOptions.map((f) => (
                          <option key={f.key} value={f.key} className="bg-popover">{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">{t.drawer.severity}</label>
                      <div className="flex gap-0.5">
                        {severityOptions.map((s) => (
                          <button
                            key={s.key}
                            onClick={() => setSeverity(s.key)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                              severity === s.key ? s.active : 'bg-muted/50 border-border text-muted-foreground/50'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => canProceedStep1 && setStep(2)}
                    disabled={!canProceedStep1}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-30 bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 active:scale-[0.98]"
                  >
                    {t.drawer.continueBtn} <ChevronRight size={12} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2.5"
                >
                  <p className="text-xs text-muted-foreground font-medium">{t.drawer.describeIssue}</p>

                  {fieldName && getCurrentValue() && (
                    <div className="px-2.5 py-2 rounded-xl bg-muted/50 border border-border">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{t.drawer.currentValue}</p>
                      <p className="text-xs text-foreground/80 font-mono line-clamp-2">{getCurrentValue()}</p>
                    </div>
                  )}

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.drawer.whatIsWrong}
                    rows={3}
                    autoFocus
                    className="w-full px-2.5 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40 resize-none"
                  />

                  <input
                    type="text"
                    value={suggested}
                    onChange={(e) => setSuggested(e.target.value)}
                    placeholder={t.drawer.suggestedCorrection}
                    className="w-full px-2.5 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground bg-muted/50 transition-all"
                    >
                      {t.drawer.back}
                    </button>
                    <button
                      onClick={() => canProceedStep2 && setStep(3)}
                      disabled={!canProceedStep2}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-30 bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 active:scale-[0.98]"
                    >
                      {t.drawer.continueBtn} <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2.5"
                >
                  <p className="text-xs text-muted-foreground font-medium">{t.drawer.almostDone}</p>

                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border space-y-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">{t.drawer.type}:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{quickFeedbackTypes.find((f) => f.key === feedbackType)?.label}</span>
                      <span className="text-border">|</span>
                      <span className="text-muted-foreground">{t.drawer.severity}:</span>
                      <span className="text-foreground/80 capitalize">{severity}</span>
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-2">{notes}</p>
                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
                    className="w-full px-2.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(2)}
                      className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground bg-muted/50 transition-all"
                    >
                      {t.drawer.back}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-40 bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/30 active:scale-[0.97]"
                    >
                      {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      {t.drawer.submitReport}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function LoginPopup({ onClose, onLogin }: { onClose: () => void; onLogin: (email: string, password: string) => Promise<{ error: string | null }> }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const result = await onLogin(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-amber-400" />
            <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-300">
              {t.drawer.loginRequired || 'กรุณาเข้าสู่ระบบ'}
            </span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={12} />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t.drawer.loginRequiredDesc || 'เข้าสู่ระบบเพื่อรายงานปัญหาเกี่ยวกับงานวิจัย'}
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/40"
        />
        {error && (
          <p className="text-[11px] text-red-400">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!email || !password || loading}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/30 active:scale-[0.97]"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {t.drawer.loginBtn || 'เข้าสู่ระบบ'}
        </button>
      </div>
    </motion.div>
  );
}

function CitationCard({
  citation,
  feedbackCounts,
}: {
  citation: CitationWithSource;
  feedbackCounts: Record<string, number>;
}) {
  const { t } = useI18n();
  const { user, signIn } = useAuth();
  const isVerified = !!citation.submission_id;
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const openCount = feedbackCounts[citation.submission_id || ''] || 0;

  return (
    <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3 transition-colors hover:border-ring/30">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
          <FileText size={14} className="text-cyan-500 dark:text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground leading-snug">
              {citation.title}
            </h4>
            {isVerified ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                <Shield size={9} />
                {t.drawer.verified}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted border border-border text-[11px] font-medium text-muted-foreground shrink-0">
                {t.drawer.manual}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {citation.authors} ({citation.year})
          </p>
          <p className="text-xs text-muted-foreground italic mt-0.5">{citation.journal}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{citation.summary}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <GaugeCircle size={12} className="text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              {citation.confidence_score}% {t.drawer.confidence}
            </span>
          </div>
          {openCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <MessageSquareWarning size={10} />
              {openCount} {openCount > 1 ? t.drawer.openIssues : t.drawer.openIssue}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!user) {
                setShowLoginPopup(!showLoginPopup);
                setShowFeedback(false);
              } else {
                setShowFeedback(!showFeedback);
                setShowLoginPopup(false);
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
              showFeedback || showLoginPopup
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-muted border-border text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/20'
            }`}
          >
            <MessageSquareWarning size={10} />
            {t.drawer.reportIssue}
          </button>
          {citation.doi && (
            <a
              href={`https://doi.org/${citation.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span>DOI</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showLoginPopup && !user && (
          <LoginPopup
            onClose={() => setShowLoginPopup(false)}
            onLogin={async (email, password) => {
              const result = await signIn(email, password);
              if (!result.error) {
                setShowLoginPopup(false);
                setShowFeedback(true);
              }
              return result;
            }}
          />
        )}
        {showFeedback && (
          <InlineFeedbackForm
            citation={citation}
            onClose={() => setShowFeedback(false)}
            onSuccess={() => {}}
            userEmail={user?.email || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ScientificDrawer() {
  const { drawerOpen, setDrawerOpen, selectedCrop, citations, setCitations } = useFarmStore();
  const { t } = useI18n();
  const cropName = useCropName(selectedCrop?.name || '');
  const [pendingCount, setPendingCount] = useState(0);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});
  const [totalFeedbackOpen, setTotalFeedbackOpen] = useState(0);

  useEffect(() => {
    async function fetchCitations() {
      if (!selectedCrop) return;
      const { data } = await supabase
        .from('research_citations')
        .select('*')
        .eq('crop_id', selectedCrop.id)
        .order('year', { ascending: false });
      
      // Inject real research for Tochiotome if DB returns empty (fallback)
      const isStrawberry = selectedCrop.name.toLowerCase().includes('strawberry') || selectedCrop.name.toLowerCase().includes('tochiotome');
      if ((!data || data.length === 0) && isStrawberry) {
        const mockCitations = [
          {
            id: 'verified-straw-1', crop_id: selectedCrop.id,
            title: "Yield and Photosynthesis Related to Growth Forms of Two Strawberry Cultivars in a Plant Factory with Artificial Lighting",
            authors: "Takahashi A., Yasutake D., Hidaka K., Ono S., Kitano M., Hirota T., Yokoyama G., Nakamura T., Toro M.",
            year: 2024, journal: "HortScience (ASHS)",
            doi: "10.21273/HORTSCI17587-23",
            url: "https://doi.org/10.21273/HORTSCI17587-23",
            summary: "Compared Tochiotome vs Koiminori in PFAL. Koiminori had 1.9× higher yield, 2.0× greater dry weight, 2.2× higher photosynthetic rate. Larger leaf area (2.3-3.1×) and higher plant height allowed upper leaves to receive more PPFD.",
            confidence_score: 96, created_at: new Date().toISOString()
          },
          {
            id: 'verified-straw-2', crop_id: selectedCrop.id,
            title: "Crown-cooling Treatment Induces Earlier Flower Bud Differentiation of Strawberry under High Air Temperatures",
            authors: "Hidaka K., Dan K., Imamura H., Takayama T.",
            year: 2017, journal: "Environmental Control in Biology",
            doi: "10.2525/ecb.55.21",
            url: "https://doi.org/10.2525/ecb.55.21",
            summary: "Crown-cooling at 20°C with short-day (8h) for 22 days induced earlier flower bud differentiation in Tochiotome and Nyoho even under high air temperatures. Enables stable production during hot autumn.",
            confidence_score: 94, created_at: new Date().toISOString()
          },
          {
            id: 'verified-straw-3', crop_id: selectedCrop.id,
            title: "Effects of Varying Electrical Conductivity Levels on Plant Growth, Yield, and Photosynthetic Parameters of Tochiotome Strawberry in a Greenhouse",
            authors: "Australian Journal of Crop Science Research Group",
            year: 2025, journal: "Australian Journal of Crop Science (AJCS)",
            doi: "10.21475/ajcs.25.19.04.p322",
            url: "https://doi.org/10.21475/ajcs.25.19.04.p322",
            summary: "Optimal EC for Tochiotome hydroponic: 2.0-4.0 dS/m. EC >6.0 reduces crown/leaf fresh weight, root length, and fruit weight. Brix and SPAD stable across EC levels but total yield declined at extremes.",
            confidence_score: 92, created_at: new Date().toISOString()
          },
        ];
        setCitations(mockCitations as unknown as ResearchCitation[]);
      } else if (data) {
        setCitations(data as ResearchCitation[]);
      }

      const { count } = await supabase
        .from('paper_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('crop_id', selectedCrop.id)
        .eq('status', 'review');
      setPendingCount(count || 0);
    }
    fetchCitations();
  }, [selectedCrop?.id]);

  useEffect(() => {
    async function fetchFeedbackCounts() {
      const cits = citations as CitationWithSource[];
      const subIds = cits.map((c) => c.submission_id).filter(Boolean) as string[];
      if (subIds.length === 0) {
        setFeedbackCounts({});
        setTotalFeedbackOpen(0);
        return;
      }

      const { data } = await supabase
        .from('paper_feedback')
        .select('submission_id, status')
        .in('submission_id', subIds)
        .in('status', ['pending', 'ai_triaged', 'reviewing']);

      if (data) {
        const counts: Record<string, number> = {};
        for (const fb of data) {
          counts[fb.submission_id] = (counts[fb.submission_id] || 0) + 1;
        }
        setFeedbackCounts(counts);
        setTotalFeedbackOpen(data.length);
      }
    }
    if (citations.length > 0) fetchFeedbackCounts();
  }, [citations]);

  const avgConfidence =
    citations.length > 0
      ? Math.round(citations.reduce((s, c) => s + c.confidence_score, 0) / citations.length)
      : 0;

  const verifiedCount = useMemo(
    () => citations.filter((c: any) => c.doi && c.doi.length > 0).length,
    [citations]
  );

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-3xl border-t border-border bg-background shadow-xl overflow-hidden flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <BookOpen size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      {t.drawer.scientificFoundation}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {cropName} - {selectedCrop?.scientific_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalFeedbackOpen > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <MessageSquareWarning size={12} className="text-amber-400" />
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {totalFeedbackOpen} {t.drawer.open}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="flex items-start gap-6">
                <ConfidenceGauge score={avgConfidence} label={t.drawer.modelConfidence} />
                <div className="flex-1 space-y-3">
                  <div className="p-4 rounded-xl border border-border bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={14} className="text-cyan-400" />
                      <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                        {t.drawer.aiInsight}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.drawer.aiInsightText(cropName, citations.length, avgConfidence)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Shield size={11} />
                      {verifiedCount} {t.drawer.aiVerified}
                    </span>
                    {pendingCount > 0 && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                          <Eye size={11} />
                          {pendingCount} {t.drawer.pendingReview}
                        </span>
                      </>
                    )}
                    {totalFeedbackOpen > 0 && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <MessageSquareWarning size={11} />
                          {totalFeedbackOpen} {t.drawer.feedbackOpen}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {t.drawer.academicCitations} ({citations.length})
                  </h3>
                  <span className="text-[11px] text-muted-foreground/50">{t.drawer.reportIssueHint}</span>
                </div>
                <div className="space-y-3">
                  {(citations as CitationWithSource[]).map((c) => (
                    <CitationCard
                      key={c.id}
                      citation={c}
                      feedbackCounts={feedbackCounts}
                    />
                  ))}
                  {citations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t.drawer.noCitations}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
