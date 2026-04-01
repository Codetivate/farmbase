/**
 * =============================================================================
 * Store: paper-store.ts (Zustand)
 * =============================================================================
 *
 * PURPOSE:
 *   Global state management สำหรับระบบ Paper Tracker ทั้งหมด
 *   จัดการ submissions, reviews, audit log, feedback, file uploads, batch operations
 *   เป็น "สมอง" ของระบบ paper pipeline ฝั่ง frontend
 *
 * HOW IT WORKS:
 *   - ใช้ Zustand store เก็บ state ทั้งหมด
 *   - Actions แบ่งเป็น:
 *     * fetch*   -> ดึงข้อมูลจาก Supabase DB (ผ่าน supabase client)
 *     * submit*  -> เรียก Edge Functions (analyze-paper, process-upload)
 *     * update*  -> อัปเดต DB โดยตรงผ่าน supabase client
 *     * promote* -> เลื่อนสถานะ paper ใน pipeline
 *
 * CONNECTED FILES:
 *   - Supabase client:  lib/supabase.ts (client instance + types)
 *   - Edge Functions:   supabase/functions/analyze-paper (submitPaper, submitBatchDOIs)
 *                        supabase/functions/process-upload (submitFileUpload, submitBatchFiles)
 *   - UI consumers:     features/papers/paper-tracker.tsx (main paper list)
 *                        features/papers/add-paper-modal.tsx (submit paper form)
 *                        features/papers/review-panel.tsx (review UI)
 *                        features/papers/feedback-dashboard.tsx (feedback list)
 *   - DB tables:        paper_submissions, paper_reviews, paper_audit_log,
 *                        paper_feedback, research_citations, crops
 *
 * PYTHON INTEGRATION:
 *   Python สามารถเรียก Edge Functions เดียวกันได้ (ดู comment ใน analyze-paper/index.ts)
 *   หรือใช้ Supabase Python client อ่าน/เขียน DB โดยตรง:
 *   ```python
 *   from supabase import create_client
 *   supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
 *   submissions = supabase.table("paper_submissions").select("*").execute()
 *   ```
 * =============================================================================
 */

import { create } from 'zustand';
import { supabase } from '@/core/database/client';
import type {
  PaperSubmission,
  PaperReview,
  PaperAuditLog,
  PaperFeedback,
  ExtractedVariable,
} from '@/core/database/client';

/** State + Actions ทั้งหมดของ paper store */
interface PaperStore {
  submissions: PaperSubmission[];
  reviews: PaperReview[];
  auditLog: PaperAuditLog[];
  feedback: PaperFeedback[];
  feedbackLoading: boolean;
  selectedSubmission: PaperSubmission | null;
  isSubmitting: boolean;
  isLoading: boolean;
  filterStatus: string;
  filterCropId: string;

  setFilterStatus: (status: string) => void;
  setFilterCropId: (cropId: string) => void;
  setSelectedSubmission: (sub: PaperSubmission | null) => void;

  fetchFeedback: () => Promise<void>;
  resolveFeedback: (feedbackId: string, resolverEmail: string, notes: string) => Promise<boolean>;
  dismissFeedback: (feedbackId: string, resolverEmail: string, notes: string) => Promise<boolean>;
  fetchSubmissions: () => Promise<void>;
  fetchReviews: (submissionId: string) => Promise<void>;
  fetchAuditLog: (submissionId: string) => Promise<void>;

  submitPaper: (params: {
    doi?: string;
    url?: string;
    crop_id: string;
    submitted_by_email: string;
    source_type?: string;
    ai_provider?: 'anthropic' | 'google' | 'openai' | 'auto';
    ai_model?: string;
    extract_knowledge?: boolean;
  }) => Promise<{ id: string; status: string; ai_provider?: string; knowledge_nodes_count?: number } | null>;

  submitFileUpload: (params: {
    file: File;
    crop_id: string;
    submitted_by_email: string;
  }) => Promise<{ id: string; status: string } | null>;

  submitBatchFiles: (params: {
    files: File[];
    crop_id: string;
    submitted_by_email: string;
    onProgress?: (index: number, status: 'uploading' | 'done' | 'error') => void;
  }) => Promise<{ succeeded: number; failed: number }>;

  submitBatchDOIs: (params: {
    entries: string[];
    crop_id: string;
    submitted_by_email: string;
    onProgress?: (index: number, status: 'processing' | 'done' | 'error') => void;
  }) => Promise<{ succeeded: number; failed: number }>;

  startDeepSearch: (params: {
    crop_name: string;
    crop_id: string;
    requested_by_email: string;
  }) => Promise<boolean>;

  submitReview: (params: {
    submission_id: string;
    reviewer_email: string;
    decision: string;
    reviewer_notes: string;
    confidence_adjustment: number;
    data_accuracy: string;
  }) => Promise<boolean>;

  updateVariable: (
    submissionId: string,
    variableKey: string,
    corrected: ExtractedVariable
  ) => Promise<boolean>;

  promoteToResearchCitation: (submissionId: string) => Promise<boolean>;

  publishApprovedCrop: (
    submissionId: string,
    cropData: {
      name: string;
      scientific_name: string;
      category: string;
      image_url: string;
      optimal_conditions: Record<string, unknown>;
      growth_params: Record<string, unknown>;
      market_data: Record<string, unknown>;
      tags: string[];
    }
  ) => Promise<string | null>;
}

export const usePaperStore = create<PaperStore>((set, get) => ({
  submissions: [],
  reviews: [],
  auditLog: [],
  feedback: [],
  feedbackLoading: false,
  selectedSubmission: null,
  isSubmitting: false,
  isLoading: false,
  filterStatus: 'all',
  filterCropId: 'all',

  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterCropId: (cropId) => set({ filterCropId: cropId }),
  setSelectedSubmission: (sub) => set({ selectedSubmission: sub }),

  /** ดึง feedback ทั้งหมดจาก paper_feedback table (เรียงตามใหม่สุด) */
  fetchFeedback: async () => {
    set({ feedbackLoading: true });
    const { data } = await supabase
      .from('paper_feedback')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) set({ feedback: data as PaperFeedback[] });
    set({ feedbackLoading: false });
  },

  /** อัปเดต feedback เป็น "resolved" พร้อมบันทึกชื่อ resolver และ notes */
  resolveFeedback: async (feedbackId, resolverEmail, notes) => {
    const { error } = await supabase
      .from('paper_feedback')
      .update({
        status: 'resolved',
        resolved_by_email: resolverEmail,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);
    if (error) return false;
    await get().fetchFeedback();
    return true;
  },

  /** อัปเดต feedback เป็น "dismissed" (ปัดทิ้ง) */
  dismissFeedback: async (feedbackId, resolverEmail, notes) => {
    const { error } = await supabase
      .from('paper_feedback')
      .update({
        status: 'dismissed',
        resolved_by_email: resolverEmail,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);
    if (error) return false;
    await get().fetchFeedback();
    return true;
  },

  fetchSubmissions: async () => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('paper_submissions')
      .select('*')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) set({ submissions: data as PaperSubmission[] });
    set({ isLoading: false });
  },

  fetchReviews: async (submissionId) => {
    const { data } = await supabase
      .from('paper_reviews')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });
    if (data) set({ reviews: data as PaperReview[] });
  },

  fetchAuditLog: async (submissionId) => {
    const { data } = await supabase
      .from('paper_audit_log')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });
    if (data) set({ auditLog: data as PaperAuditLog[] });
  },

  /**
   * ส่ง paper ไปวิเคราะห์ -> เรียก Edge Function "analyze-paper"
   * Flow: POST to /functions/v1/analyze-paper -> CrossRef + AI -> paper_submissions updated
   */
  submitPaper: async ({ doi, url, crop_id, submitted_by_email, source_type, ai_provider, ai_model, extract_knowledge }) => {
    set({ isSubmitting: true });
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const apiUrl = `${supabaseUrl}/functions/v1/analyze-paper`;

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doi, url, crop_id, submitted_by_email,
          source_type: source_type || (doi ? 'doi' : 'url'),
          ai_provider: ai_provider || 'auto',
          ai_model: ai_model || '',
          extract_knowledge: extract_knowledge !== false,
        }),
      });

      const result = await resp.json();
      if (result.error) {
        set({ isSubmitting: false });
        return null;
      }

      await get().fetchSubmissions();
      set({ isSubmitting: false });
      return {
        id: result.id,
        status: result.status,
        ai_provider: result.ai_provider,
        knowledge_nodes_count: result.knowledge_nodes_count,
      };
    } catch {
      set({ isSubmitting: false });
      return null;
    }
  },

  /**
   * อัปโหลดไฟล์เอกสาร -> เรียก Edge Function "process-upload" (multipart/form-data)
   * ไฟล์ถูกเก็บใน Supabase Storage "training-files" + วิเคราะห์ด้วย AI
   */
  submitFileUpload: async ({ file, crop_id, submitted_by_email }) => {
    set({ isSubmitting: true });
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const apiUrl = `${supabaseUrl}/functions/v1/process-upload`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', submitted_by_email);
      formData.append('crop_id', crop_id);
      formData.append('purpose', 'reference');

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: formData,
      });

      const result = await resp.json();
      if (result.error) {
        set({ isSubmitting: false });
        return null;
      }

      await get().fetchSubmissions();
      set({ isSubmitting: false });
      return { id: result.id, status: 'analyzing' };
    } catch {
      set({ isSubmitting: false });
      return null;
    }
  },

  /** อัปโหลดหลายไฟล์พร้อมกัน (sequential) พร้อม progress callback */
  submitBatchFiles: async ({ files, crop_id, submitted_by_email, onProgress }) => {
    set({ isSubmitting: true });
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      onProgress?.(i, 'uploading');
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const apiUrl = `${supabaseUrl}/functions/v1/process-upload`;

        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('email', submitted_by_email);
        formData.append('crop_id', crop_id);
        formData.append('purpose', 'reference');

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${supabaseAnonKey}` },
          body: formData,
        });

        const result = await resp.json();
        if (result.error) {
          failed++;
          onProgress?.(i, 'error');
        } else {
          succeeded++;
          onProgress?.(i, 'done');
        }
      } catch {
        failed++;
        onProgress?.(i, 'error');
      }
    }

    await get().fetchSubmissions();
    set({ isSubmitting: false });
    return { succeeded, failed };
  },

  /** ส่งหลาย DOI/URL พร้อมกัน (sequential) แต่ละตัวเรียก analyze-paper */
  submitBatchDOIs: async ({ entries, crop_id, submitted_by_email, onProgress }) => {
    set({ isSubmitting: true });
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < entries.length; i++) {
      onProgress?.(i, 'processing');
      try {
        const raw = entries[i].trim();
        if (!raw) { succeeded++; onProgress?.(i, 'done'); continue; }

        const isDOI = raw.match(/^10\.\d{4,}/);
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const apiUrl = `${supabaseUrl}/functions/v1/analyze-paper`;

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doi: isDOI ? raw : undefined,
            url: isDOI ? undefined : raw,
            crop_id,
            submitted_by_email,
            source_type: isDOI ? 'doi' : 'url',
          }),
        });

        const result = await resp.json();
        if (result.error) {
          failed++;
          onProgress?.(i, 'error');
        } else {
          succeeded++;
          onProgress?.(i, 'done');
        }
      } catch {
        failed++;
        onProgress?.(i, 'error');
      }
    }

    await get().fetchSubmissions();
    set({ isSubmitting: false });
    return { succeeded, failed };
  },

  /** Deep search: สร้าง 3 search queries จากชื่อพืช แล้วส่งไปวิเคราะห์ทีละตัว */
  startDeepSearch: async ({ crop_name, crop_id, requested_by_email }) => {
    set({ isSubmitting: true });
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const apiUrl = `${supabaseUrl}/functions/v1/analyze-paper`;

      const searchQueries = [
        `${crop_name} optimal temperature humidity cultivation`,
        `${crop_name} growth parameters controlled environment`,
        `${crop_name} yield economics commercial production`,
      ];

      for (const query of searchQueries) {
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`,
            crop_id,
            submitted_by_email: requested_by_email,
            source_type: 'deep_search',
          }),
        });
      }

      await get().fetchSubmissions();
      set({ isSubmitting: false });
      return true;
    } catch {
      set({ isSubmitting: false });
      return false;
    }
  },

  /** Admin แก้ไขตัวแปรที่ AI ดึงออกมา (เช่น แก้อุณหภูมิที่ผิด) -> บันทึก + audit log */
  updateVariable: async (submissionId, variableKey, corrected) => {
    const sub = get().submissions.find((s) => s.id === submissionId);
    if (!sub) return false;

    const updated = {
      ...(sub.admin_corrected_variables || {}),
      [variableKey]: corrected,
    };

    const { error } = await supabase
      .from('paper_submissions')
      .update({
        admin_corrected_variables: updated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) return false;

    await supabase.from('paper_audit_log').insert({
      submission_id: submissionId,
      action: 'variable_corrected',
      actor_email: 'admin',
      details: { variable_key: variableKey, corrected_value: corrected.value, corrected_unit: corrected.unit },
    });

    await get().fetchSubmissions();
    return true;
  },

  /** สร้าง crop ใหม่จาก paper ที่ approved แล้ว -> insert crops + promote to citation */
  publishApprovedCrop: async (submissionId, cropData) => {
    const sub = get().submissions.find((s) => s.id === submissionId);
    if (!sub || sub.status !== 'approved') return null;

    const { data: crop, error } = await supabase
      .from('crops')
      .insert({
        ...cropData,
        source_submission_id: submissionId,
        is_published: true,
      })
      .select()
      .single();

    if (error || !crop) return null;

    await supabase
      .from('paper_submissions')
      .update({ published_crop_id: crop.id, updated_at: new Date().toISOString() })
      .eq('id', submissionId);

    await supabase.from('paper_audit_log').insert({
      submission_id: submissionId,
      action: 'crop_published',
      actor_email: 'admin',
      details: { crop_id: crop.id, crop_name: cropData.name },
    });

    await get().promoteToResearchCitation(submissionId);
    await get().fetchSubmissions();
    return crop.id;
  },

  /**
   * Submit review สำหรับ paper -> insert paper_reviews + update paper status + audit log
   * decision: approved -> status="approved", rejected -> status="rejected", needs_revision -> status="review"
   */
  submitReview: async (params) => {
    try {
      const { error: reviewError } = await supabase
        .from('paper_reviews')
        .insert({
          submission_id: params.submission_id,
          reviewer_email: params.reviewer_email,
          decision: params.decision,
          reviewer_notes: params.reviewer_notes,
          confidence_adjustment: params.confidence_adjustment,
          data_accuracy: params.data_accuracy,
          reviewed_at: new Date().toISOString(),
        });

      if (reviewError) return false;

      const newStatus = params.decision === 'approved' ? 'approved' : params.decision === 'rejected' ? 'rejected' : 'review';

      await supabase
        .from('paper_submissions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', params.submission_id);

      await supabase.from('paper_audit_log').insert({
        submission_id: params.submission_id,
        action: params.decision,
        actor_email: params.reviewer_email,
        details: {
          notes: params.reviewer_notes,
          confidence_adjustment: params.confidence_adjustment,
          data_accuracy: params.data_accuracy,
        },
      });

      await get().fetchSubmissions();
      await get().fetchReviews(params.submission_id);
      await get().fetchAuditLog(params.submission_id);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * เลื่อน paper ที่ approved ไปเป็น research_citation (ขั้นสุดท้ายของ pipeline)
   * คำนวณ finalConfidence จาก AI score + reviewer adjustments
   * เขียนลง research_citations table + audit log
   */
  promoteToResearchCitation: async (submissionId) => {
    const sub = get().submissions.find((s) => s.id === submissionId);
    if (!sub || sub.status !== 'approved') return false;

    const reviews = get().reviews;
    const totalAdjustment = reviews.reduce((sum, r) => sum + r.confidence_adjustment, 0);
    const finalConfidence = Math.max(0, Math.min(100, sub.ai_confidence_score + totalAdjustment));

    const { error } = await supabase.from('research_citations').insert({
      crop_id: sub.crop_id,
      title: sub.title,
      authors: sub.authors,
      journal: sub.journal,
      year: sub.year,
      doi: sub.doi,
      summary: sub.ai_summary,
      confidence_score: finalConfidence,
      submission_id: sub.id,
    });

    if (error) return false;

    await supabase.from('paper_audit_log').insert({
      submission_id: submissionId,
      action: 'promoted',
      actor_email: 'system',
      details: { final_confidence: finalConfidence },
    });

    return true;
  },
}));
