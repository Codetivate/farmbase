/**
 * =============================================================================
 * Supabase Client + TypeScript Type Definitions
 * =============================================================================
 *
 * PURPOSE:
 *   1. สร้าง Supabase client singleton สำหรับใช้ทั่วทั้ง frontend
 *   2. กำหนด TypeScript interfaces ที่ map กับ database tables
 *      ทำให้ทุก component ที่ใช้ข้อมูลจาก DB ได้ type safety
 *
 * HOW IT WORKS:
 *   - ใช้ NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY จาก .env
 *   - สร้าง client ด้วย createClient() แล้ว export เป็น singleton
 *   - Export types ให้ไฟล์อื่นใช้: Crop, ResearchCitation, PaperSubmission, etc.
 *
 * CONNECTED FILES:
 *   - ใช้โดย:  store/farm-store.ts, store/paper-store.ts, lib/auth-context.tsx
 *   - ใช้โดย:  features/papers/*, features/marketplace/*, features/auth/*
 *   - DB tables ที่ map: crops, research_citations, simulations,
 *                         paper_submissions, paper_reviews, paper_audit_log,
 *                         paper_feedback, training_uploads
 *
 * PYTHON INTEGRATION:
 *   Python ใช้ supabase-py ซึ่งมี API เหมือนกัน:
 *   ```python
 *   from supabase import create_client
 *   supabase = create_client(
 *       os.environ["SUPABASE_URL"],
 *       os.environ["SUPABASE_ANON_KEY"]
 *   )
 *   # ใช้ .table().select() / .insert() / .update() เหมือน JS client
 *   ```
 *
 * NOTE FOR NEWBIES:
 *   - Interface ชื่อเดียวกับ DB table (เช่น Crop -> crops table)
 *   - ดูโครงสร้าง DB จริงได้ที่ supabase/migrations/
 *   - ถ้าเพิ่ม column ใหม่ใน DB ต้องเพิ่ม field ใน interface ด้วย
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase client singleton - ใช้ร่วมกันทั้ง app (anon key = respects RLS) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** สภาพแวดล้อมที่เหมาะสมของพืช (DB: crops.optimal_conditions JSONB) */
export interface CropOptimalConditions {
  temperature: { min: number; max: number; optimal: number; unit: string };
  humidity: { min: number; max: number; optimal: number; unit: string };
  co2: { min: number; max: number; optimal: number; unit: string };
  light: { min: number; max: number; optimal: number; unit: string };
  ph: { min: number; max: number; optimal: number };
}

/** พารามิเตอร์ logistic growth model (DB: crops.growth_params JSONB) */
export interface GrowthParams {
  max_height_cm: number;
  carrying_capacity_K: number;
  growth_rate_r: number;
  midpoint_t0: number;
  cycle_days: number;
  biomass_density_g_per_cm3: number;
}

/** ข้อมูลตลาดของพืช (DB: crops.market_data JSONB) - อัปเดตจาก update-market-prices function */
export interface MarketData {
  price_per_kg_usd: number;
  price_per_kg_thb?: number;
  usd_thb_rate?: number;
  price_change_pct?: number;
  last_price_update?: string;
  yield_per_sqm_kg: number;
  demand_index: number;
  seasonality: string[];
  capex_per_sqm_usd: number;
  opex_per_cycle_usd: number;
}

/** DB table: crops - ข้อมูลหลักของพืชแต่ละชนิด */
export interface Crop {
  id: string;
  name: string;
  scientific_name: string;
  category: string;
  optimal_conditions: CropOptimalConditions;
  growth_params: GrowthParams;
  market_data: MarketData;
  tags: string[];
  image_url: string;
  benefit_summary_en: string;
  benefit_summary_th: string;
  created_at: string;
}

/** DB table: research_citations - paper ที่ผ่าน review แล้ว (ขั้นสุดท้ายของ pipeline) */
export interface ResearchCitation {
  id: string;
  crop_id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  doi: string;
  summary: string;
  confidence_score: number;
  created_at: string;
}

/** DB table: simulations - ผลการจำลองการเติบโตของพืช */
export interface Simulation {
  id: string;
  crop_id: string;
  environment_params: Record<string, number>;
  growth_output: Record<string, number[]>;
  roi_estimate: Record<string, number>;
  status: string;
  created_at: string;
}

export type SubmissionStatus = 'pending' | 'analyzing' | 'review' | 'approved' | 'rejected' | 'error';
export type ReviewDecision = 'approved' | 'rejected' | 'needs_revision';
export type DataAccuracy = 'accurate' | 'minor_issues' | 'major_issues';

/** ตัวแปรที่ AI ดึงออกจาก paper (เช่น temperature=25C, humidity=90%) */
export interface ExtractedVariable {
  key: string;
  label: string;
  value: string;
  unit: string;
  confidence: number;
}

/** DB table: paper_submissions - paper ที่ submit เข้ามาในระบบ (ทุกสถานะ) */
export interface PaperSubmission {
  id: string;
  doi: string;
  url: string;
  crop_id: string;
  submitted_by_email: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  abstract_text: string;
  ai_summary: string;
  ai_confidence_score: number;
  ai_relevance_tags: string[];
  ai_model_used: string;
  ai_extracted_variables: Record<string, ExtractedVariable>;
  admin_corrected_variables: Record<string, ExtractedVariable>;
  source_type: 'doi' | 'url' | 'upload' | 'deep_search';
  file_path: string;
  published_crop_id: string | null;
  status: SubmissionStatus;
  error_message: string;
  created_at: string;
  updated_at: string;
}

/** DB table: paper_reviews - review ของ reviewer แต่ละคนต่อ paper */
export interface PaperReview {
  id: string;
  submission_id: string;
  reviewer_email: string;
  decision: ReviewDecision;
  reviewer_notes: string;
  confidence_adjustment: number;
  data_accuracy: DataAccuracy;
  reviewed_at: string | null;
  created_at: string;
}

/** DB table: paper_audit_log - ประวัติทุก action ที่เกิดกับ paper */
export interface PaperAuditLog {
  id: string;
  submission_id: string;
  action: string;
  actor_email: string;
  details: Record<string, unknown>;
  created_at: string;
}

export type FeedbackType = 'data_error' | 'missing_info' | 'wrong_crop' | 'confidence_too_high' | 'confidence_too_low' | 'outdated' | 'other';
export type FeedbackStatus = 'pending' | 'ai_triaged' | 'reviewing' | 'resolved' | 'dismissed';
export type TriageAction = 'auto_fix' | 'needs_review' | 'likely_invalid';

/** DB table: paper_feedback - feedback จาก user เกี่ยวกับข้อมูลใน paper */
export interface PaperFeedback {
  id: string;
  submission_id: string;
  feedback_type: FeedbackType;
  field_name: string;
  original_value: string;
  suggested_value: string;
  feedback_notes: string;
  reporter_email: string;
  severity: string;
  status: FeedbackStatus;
  ai_analysis: string;
  ai_recommendation: TriageAction | '';
  ai_confidence: number;
  ai_processed_at: string | null;
  resolved_by_email: string;
  resolution_notes: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UploadPurpose = 'training' | 'reference' | 'dataset';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PrivacyLevel = 'public' | 'internal' | 'confidential' | 'restricted';

/** DB table: training_uploads - ไฟล์ที่อัปโหลดเข้าระบบ (PDF, CSV, etc.) */
export interface TrainingUpload {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  uploaded_by_email: string;
  crop_id: string | null;
  purpose: UploadPurpose;
  processing_status: ProcessingStatus;
  ai_extracted_text: string;
  ai_summary: string;
  ai_tags: string[];
  ai_confidence: number;
  ai_model_used: string;
  ai_processed_at: string | null;
  privacy_level: PrivacyLevel;
  retention_days: number;
  is_redacted: boolean;
  error_message: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** DB table: design_rules - Phase 2 Parametric rules */
export interface DesignRule {
  id: string;
  condition_type: string;
  operator: string;
  value: number;
  material_action: string;
  created_at: string;
}

/** DB table: materials_db - Phase 3 Procurement materials */
export interface MaterialItem {
  id: string;
  category: string;
  name: string;
  supplier_link: string | null;
  unit_cost: number;
  created_at: string;
}

/** DB table: user_designs - User generated designs from the Parametric Lab */
export interface UserDesign {
  id: string;
  user_id: string;
  crop_id: string;
  target_yield_kg: number;
  calculated_area_m2: number | null;
  generated_bom: Record<string, any>[];
  ifc_model_status: string;
  created_at: string;
  updated_at: string;
}

/** DB table: digital_twins - Phase 4 Physical Edge Devices */
export interface DigitalTwin {
  id: string;
  design_id: string;
  user_id: string;
  status: 'provisioning' | 'active' | 'offline' | 'maintenance';
  hardware_mac_address: string | null;
  latest_telemetry: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/** DB table: sensor_telemetry - Phase 4 Time-series IoT Data */
export interface SensorTelemetry {
  id: string;
  twin_id: string;
  temperature: number;
  humidity: number;
  co2: number;
  light: number;
  soil_ph: number;
  recorded_at: string;
}
