'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Loader as Loader2,
  CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle,
  X,
  Brain,
  ArrowRight,
  Sparkles,
  Eye,
  ShieldCheck,
  Upload,
  Search,
  FileText,
  Trash2,
  Plus,
  Zap,
  ChevronDown,
  Database,
} from 'lucide-react';
import { usePaperStore } from '@/store/paper-store';
import type { Crop } from '@/types/models';

type InputMode = 'deep_search' | 'doi' | 'upload';
type FileStatus = 'pending' | 'uploading' | 'done' | 'error';
type AIProvider = 'auto' | 'anthropic' | 'google' | 'openai';

interface QueuedFile {
  file: File;
  status: FileStatus;
}

interface AddPaperModalProps {
  open: boolean;
  onClose: () => void;
  crops: Crop[];
}

const AI_PROVIDERS_ORDER: AIProvider[] = ['google', 'auto', 'anthropic', 'openai'];

const AI_MODELS: Record<AIProvider, { label: string; desc: string; models: { value: string; label: string }[]; color: string }> = {
  google: {
    label: 'Google',
    desc: 'Gemini',
    models: [
      { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
    ],
    color: 'sky',
  },
  auto: {
    label: 'Auto',
    desc: 'Best available',
    models: [{ value: '', label: 'Auto-detect' }],
    color: 'emerald',
  },
  anthropic: {
    label: 'Anthropic',
    desc: 'Claude',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4' },
    ],
    color: 'amber',
  },
  openai: {
    label: 'OpenAI',
    desc: 'GPT',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
    ],
    color: 'teal',
  },
};

export default function AddPaperModal({ open, onClose, crops }: AddPaperModalProps) {
  const { submitPaper, submitBatchFiles, submitBatchDOIs, startDeepSearch, isSubmitting } = usePaperStore();
  const [doi, setDoi] = useState('');
  const [bulkDois, setBulkDois] = useState('');
  const [url, setUrl] = useState('');
  const [cropId, setCropId] = useState('');
  const [cropName, setCropName] = useState('');
  const [email, setEmail] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('doi');
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [batchProgress, setBatchProgress] = useState<number | null>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>('google');
  const [aiModel, setAiModel] = useState('gemini-2.5-pro-preview-06-05');
  const [extractKnowledge, setExtractKnowledge] = useState(true);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsedDois = bulkDois
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const isBulkDoi = parsedDois.length > 1;
  const isBulkUpload = files.length > 1;
  const totalItems = inputMode === 'upload' ? files.length : inputMode === 'doi' ? (isBulkDoi ? parsedDois.length : 1) : 1;

  const handleFilesSelected = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles: QueuedFile[] = Array.from(selectedFiles).map((f) => ({ file: f, status: 'pending' as FileStatus }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const handleSubmit = async () => {
    if (!cropId || !email) return;
    setResult(null);
    setBatchProgress(null);

    if (inputMode === 'deep_search') {
      const selectedCrop = crops.find((c) => c.id === cropId);
      const name = selectedCrop?.name || cropName;
      if (!name) return;
      const ok = await startDeepSearch({ crop_name: name, crop_id: cropId, requested_by_email: email });
      setResult(ok
        ? { success: true, message: `Deep Search launched for "${name}". AI is scanning academic databases.` }
        : { success: false, message: 'Deep Search failed. Try again.' }
      );
    } else if (inputMode === 'doi') {
      if (isBulkDoi) {
        const { succeeded, failed } = await submitBatchDOIs({
          entries: parsedDois,
          crop_id: cropId,
          submitted_by_email: email,
          onProgress: (idx) => setBatchProgress(idx + 1),
        });
        setBatchProgress(null);
        setResult({
          success: succeeded > 0,
          message: `${succeeded} paper${succeeded !== 1 ? 's' : ''} sent for analysis${failed > 0 ? `, ${failed} failed` : ''}.`,
        });
        if (succeeded > 0) setBulkDois('');
      } else {
        const singleEntry = doi || url;
        if (!singleEntry) return;
        const isDOI = doi && doi.match(/^10\.\d{4,}/);
        const res = await submitPaper({
          doi: isDOI ? doi : undefined,
          url: isDOI ? undefined : (url || doi),
          crop_id: cropId,
          submitted_by_email: email,
          source_type: isDOI ? 'doi' : 'url',
          ai_provider: aiProvider,
          ai_model: aiModel,
          extract_knowledge: extractKnowledge,
        });
        const providerLabel = res?.ai_provider ? ` (${res.ai_provider})` : '';
        const knowledgeLabel = res?.knowledge_nodes_count ? ` | ${res.knowledge_nodes_count} knowledge nodes extracted` : '';
        setResult(res
          ? { success: true, message: `Paper sent for AI analysis${providerLabel}${knowledgeLabel}. Results will appear shortly.` }
          : { success: false, message: 'Failed to process. Check your input.' }
        );
        if (res) { setDoi(''); setUrl(''); }
      }
    } else if (inputMode === 'upload') {
      if (files.length === 0) return;

      if (isBulkUpload) {
        const rawFiles = files.map((f) => f.file);
        const { succeeded, failed } = await submitBatchFiles({
          files: rawFiles,
          crop_id: cropId,
          submitted_by_email: email,
          onProgress: (idx, status) => {
            setBatchProgress(idx + 1);
            setFiles((prev) => prev.map((f, i) => i === idx ? { ...f, status } : f));
          },
        });
        setBatchProgress(null);
        setResult({
          success: succeeded > 0,
          message: `${succeeded} file${succeeded !== 1 ? 's' : ''} uploaded and sent for analysis${failed > 0 ? `, ${failed} failed` : ''}.`,
        });
        if (succeeded > 0) setFiles((prev) => prev.filter((f) => f.status === 'error'));
      } else {
        const singleFile = files[0].file;
        setFiles((prev) => [{ ...prev[0], status: 'uploading' }]);
        const res = await usePaperStore.getState().submitFileUpload({
          file: singleFile,
          crop_id: cropId,
          submitted_by_email: email,
        });
        setResult(res
          ? { success: true, message: `"${singleFile.name}" uploaded and sent for AI analysis.` }
          : { success: false, message: 'Upload failed. Check the file and try again.' }
        );
        if (res) {
          setFiles([]);
          if (fileRef.current) fileRef.current.value = '';
        } else {
          setFiles((prev) => [{ ...prev[0], status: 'error' }]);
        }
      }
    }
  };

  const canSubmit = cropId && email && !isSubmitting && (
    inputMode === 'deep_search' ||
    (inputMode === 'doi' && (doi || url || isBulkDoi)) ||
    (inputMode === 'upload' && files.length > 0)
  );

  if (!open) return null;

  const modes: { key: InputMode; label: string; icon: typeof Brain; desc: string }[] = [
    { key: 'deep_search', label: 'Deep Search AI', icon: Search, desc: 'Auto-find papers' },
    { key: 'doi', label: 'DOI / URL', icon: Link2, desc: 'Single or bulk' },
    { key: 'upload', label: 'Upload Files', icon: Upload, desc: 'One or many' },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="fixed inset-x-3 bottom-3 sm:bottom-auto sm:top-[5%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles size={16} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ingest Research Papers</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Add one or multiple papers at once</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 whitespace-nowrap">
              <div className="flex items-center gap-1"><Search size={10} />Ingest</div>
              <ArrowRight size={10} className="text-muted-foreground/50" />
              <div className="flex items-center gap-1"><Brain size={10} />AI Analyze</div>
              <ArrowRight size={10} className="text-muted-foreground/50" />
              <div className="flex items-center gap-1"><Database size={10} />Knowledge</div>
              <ArrowRight size={10} className="text-muted-foreground/50" />
              <div className="flex items-center gap-1"><Eye size={10} />Review</div>
              <ArrowRight size={10} className="text-muted-foreground/50" />
              <div className="flex items-center gap-1"><ShieldCheck size={10} />Publish</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => setInputMode(m.key)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    inputMode === m.key
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-ring/30'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-[11px] font-semibold">{m.label}</span>
                  <span className="text-[11px] opacity-60">{m.desc}</span>
                </button>
              );
            })}
          </div>

          {inputMode === 'deep_search' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-secondary/40 border border-border space-y-2"
            >
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-amber-400" />
                <span className="text-xs font-semibold text-foreground">AI Deep Search</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                AI will scan academic databases (CrossRef, PubMed, Google Scholar) to find foundational research papers
                for your selected crop. Multiple papers will be automatically analyzed and queued for review.
              </p>
            </motion.div>
          )}

          {inputMode === 'doi' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted-foreground font-medium">DOI or URL</label>
                <span className="text-[11px] text-muted-foreground/50">
                  {isBulkDoi ? `${parsedDois.length} entries detected` : 'Paste multiple lines for bulk'}
                </span>
              </div>
              <textarea
                value={bulkDois}
                onChange={(e) => {
                  setBulkDois(e.target.value);
                  const lines = e.target.value.split('\n').filter((l) => l.trim());
                  if (lines.length <= 1) {
                    const single = lines[0]?.trim() || '';
                    if (single.match(/^10\.\d{4,}/)) {
                      setDoi(single);
                      setUrl('');
                    } else if (single) {
                      setUrl(single);
                      setDoi('');
                    }
                  }
                }}
                placeholder={"Paste one DOI/URL per line:\n10.1016/j.scienta.2020.109236\n10.1007/s00484-021-02143-y\nhttps://arxiv.org/abs/2301.12345"}
                rows={isBulkDoi ? 5 : 3}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/40 font-mono resize-none transition-all"
              />

              {isBulkDoi && (
                <div className="flex flex-wrap gap-1.5">
                  {parsedDois.slice(0, 8).map((entry, i) => {
                    const isDOI = entry.match(/^10\.\d{4,}/);
                    return (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono truncate max-w-[200px] ${
                          isDOI
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/15'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                        }`}
                      >
                        {isDOI ? 'DOI' : 'URL'}: {entry.slice(0, 30)}{entry.length > 30 ? '...' : ''}
                      </span>
                    );
                  })}
                  {parsedDois.length > 8 && (
                    <span className="px-2 py-0.5 rounded-lg text-[11px] text-muted-foreground bg-muted">
                      +{parsedDois.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {inputMode === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.csv,.json,.md"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="w-full flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-emerald-500/25 bg-muted/50 hover:bg-emerald-500/5 transition-all cursor-pointer"
              >
                <div className="p-3 rounded-xl bg-muted">
                  <Upload size={20} className="text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground/80">Drop files or click to browse</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">PDF, TXT, CSV, JSON, MD -- select multiple files at once</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {files.map((qf, i) => (
                    <div
                      key={`${qf.file.name}-${i}`}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                        qf.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/15'
                          : qf.status === 'error' ? 'bg-red-500/5 border-red-500/15'
                            : qf.status === 'uploading' ? 'bg-amber-500/5 border-amber-500/15'
                              : 'bg-muted/50 border-border'
                      }`}
                    >
                      <FileText size={13} className={
                        qf.status === 'done' ? 'text-emerald-400'
                          : qf.status === 'error' ? 'text-red-400'
                            : qf.status === 'uploading' ? 'text-amber-400'
                              : 'text-muted-foreground'
                      } />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground font-medium truncate">{qf.file.name}</p>
                        <p className="text-[11px] text-muted-foreground/50">{(qf.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      {qf.status === 'uploading' && <Loader2 size={12} className="text-amber-400 animate-spin shrink-0" />}
                      {qf.status === 'done' && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                      {qf.status === 'error' && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                      {qf.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="p-0.5 rounded hover:bg-secondary text-muted-foreground/50 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {files.length} file{files.length !== 1 ? 's' : ''} queued
                  </span>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <Plus size={10} /> Add more
                  </button>
                </div>
              )}
            </motion.div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowAiConfig(!showAiConfig)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/50 border border-border hover:border-ring/30 transition-all"
            >
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-amber-400" />
                <span className="text-[11px] font-medium text-foreground/80">AI Engine</span>
                <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                  {aiProvider === 'auto' ? 'Auto' : AI_MODELS[aiProvider].label}
                  {aiModel && aiProvider !== 'auto' ? ` / ${AI_MODELS[aiProvider].models.find(m => m.value === aiModel)?.label || aiModel}` : ''}
                </span>
              </div>
              <ChevronDown size={13} className={`text-muted-foreground transition-transform ${showAiConfig ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAiConfig && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    <div className="grid grid-cols-4 gap-1.5">
                      {AI_PROVIDERS_ORDER.map((key) => {
                        const cfg = AI_MODELS[key];
                        return [key, cfg] as [AIProvider, typeof cfg];
                      }).map(([key, cfg]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setAiProvider(key);
                            setAiModel(cfg.models[0].value);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center ${
                            aiProvider === key
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                              : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-ring/30'
                          }`}
                        >
                          <span className="text-[11px] font-semibold">{cfg.label}</span>
                          <span className="text-[11px] opacity-60">{cfg.desc}</span>
                        </button>
                      ))}
                    </div>

                    {aiProvider !== 'auto' && AI_MODELS[aiProvider].models.length > 1 && (
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-[11px] text-foreground focus:outline-none focus:border-teal-500/40 appearance-none"
                      >
                        {AI_MODELS[aiProvider].models.map((m) => (
                          <option key={m.value} value={m.value} className="bg-popover">{m.label}</option>
                        ))}
                      </select>
                    )}

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setExtractKnowledge(!extractKnowledge)}
                        className={`w-8 h-[18px] rounded-full relative transition-colors ${
                          extractKnowledge ? 'bg-emerald-500' : 'bg-muted'
                        }`}
                      >
                        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all shadow-sm ${
                          extractKnowledge ? 'left-[15px]' : 'left-[2px]'
                        }`} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Database size={11} className={extractKnowledge ? 'text-emerald-400' : 'text-muted-foreground/50'} />
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                          Extract to Knowledge Graph
                        </span>
                      </div>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1.5">Target Crop</label>
              <select
                value={cropId}
                onChange={(e) => {
                  setCropId(e.target.value);
                  const c = crops.find((cr) => cr.id === e.target.value);
                  if (c) setCropName(c.name);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-xs text-foreground focus:outline-none focus:border-teal-500/40 appearance-none"
              >
                <option value="" className="bg-popover">Select crop...</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1.5">Your Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@team.com"
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/40"
              />
            </div>
          </div>

          <AnimatePresence>
            {batchProgress !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-400 font-medium">Processing {batchProgress} of {totalItems}...</span>
                  <span className="text-muted-foreground/50 font-mono">{Math.round((batchProgress / totalItems) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(batchProgress / totalItems) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
                  result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {result.success ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                <span>{result.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <><Loader2 size={15} className="animate-spin" /> Processing...</>
            ) : inputMode === 'deep_search' ? (
              <><Brain size={15} /> Launch Deep Search</>
            ) : inputMode === 'upload' ? (
              <><Upload size={15} /> Upload {isBulkUpload ? `${files.length} Files` : '& Analyze'}</>
            ) : isBulkDoi ? (
              <><Sparkles size={15} /> Analyze {parsedDois.length} Papers</>
            ) : (
              <><Sparkles size={15} /> Send to AI Research</>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
