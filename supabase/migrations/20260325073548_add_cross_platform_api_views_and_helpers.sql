/*
  # Cross-Platform API Views & Helper Functions
  
  PURPOSE:
    สร้าง database views และ helper functions ที่ทำให้ Python, NextJS, TypeScript
    เข้าถึงข้อมูลได้ง่ายขึ้น โดยไม่ต้อง join เอง
    ออกแบบให้ newbie สามารถ query ข้อมูลได้ทันทีจากทุก platform

  1. New Views
    - `v_crops_with_latest_prices`
      Joins crops + market_prices (is_latest=true) + citation count
      ใช้แสดงข้อมูลพืชพร้อมราคาล่าสุดและจำนวน paper ที่อ้างอิง
    
    - `v_paper_pipeline_summary`
      Joins paper_submissions + crop name + review count + feedback count
      ใช้แสดง paper pipeline dashboard

    - `v_active_users`
      Joins user_profiles (is_active=true)
      ใช้ list active users สำหรับ admin panel

  2. Helper Functions
    - `get_crop_citations(crop_uuid)` -> returns research_citations ของ crop
    - `get_paper_timeline(submission_uuid)` -> returns audit log timeline

  3. Important Notes
    - Views เป็น read-only, ใช้ RLS ของ underlying tables
    - ทุก view ใช้ LEFT JOIN เพื่อไม่หาย data กรณีไม่มี prices/citations
    - Python/TypeScript สามารถ query views ได้เหมือน table ปกติ:
      `supabase.from("v_crops_with_latest_prices").select("*")`
*/

-- =============================================================================
-- VIEW: v_crops_with_latest_prices
-- ใช้แสดงรายการพืชพร้อมราคาล่าสุด + จำนวน citations
-- Frontend: marketplace-feed.tsx | Python: supabase.table("v_crops_with_latest_prices")
-- =============================================================================
CREATE OR REPLACE VIEW v_crops_with_latest_prices AS
SELECT
  c.id,
  c.name,
  c.scientific_name,
  c.category,
  c.optimal_conditions,
  c.growth_params,
  c.market_data,
  c.tags,
  c.image_url,
  c.benefit_summary_en,
  c.benefit_summary_th,
  c.created_at,
  mp.price_per_kg_usd AS latest_price_usd,
  mp.price_per_kg_thb AS latest_price_thb,
  mp.usd_thb_rate AS latest_usd_thb_rate,
  mp.demand_index AS latest_demand_index,
  mp.price_change_pct AS latest_price_change_pct,
  mp.fetched_at AS price_updated_at,
  COALESCE(rc.citation_count, 0) AS citation_count
FROM crops c
LEFT JOIN market_prices mp
  ON mp.crop_id = c.id AND mp.is_latest = true
LEFT JOIN (
  SELECT crop_id, COUNT(*) AS citation_count
  FROM research_citations
  GROUP BY crop_id
) rc ON rc.crop_id = c.id;

-- =============================================================================
-- VIEW: v_paper_pipeline_summary
-- ใช้แสดง paper pipeline พร้อม crop name, จำนวน reviews, จำนวน feedback
-- Frontend: paper-tracker.tsx | Python: supabase.table("v_paper_pipeline_summary")
-- =============================================================================
CREATE OR REPLACE VIEW v_paper_pipeline_summary AS
SELECT
  ps.id,
  ps.doi,
  ps.url,
  ps.crop_id,
  c.name AS crop_name,
  ps.submitted_by_email,
  ps.title,
  ps.authors,
  ps.year,
  ps.journal,
  ps.ai_summary,
  ps.ai_confidence_score,
  ps.ai_relevance_tags,
  ps.ai_model_used,
  ps.status,
  ps.error_message,
  ps.priority,
  ps.assigned_to_email,
  ps.created_at,
  ps.updated_at,
  COALESCE(pr.review_count, 0) AS review_count,
  COALESCE(pf.feedback_count, 0) AS feedback_count,
  pr.latest_decision
FROM paper_submissions ps
LEFT JOIN crops c ON c.id = ps.crop_id
LEFT JOIN (
  SELECT
    submission_id,
    COUNT(*) AS review_count,
    (ARRAY_AGG(decision ORDER BY created_at DESC))[1] AS latest_decision
  FROM paper_reviews
  GROUP BY submission_id
) pr ON pr.submission_id = ps.id
LEFT JOIN (
  SELECT submission_id, COUNT(*) AS feedback_count
  FROM paper_feedback
  GROUP BY submission_id
) pf ON pf.submission_id = ps.id;

-- =============================================================================
-- VIEW: v_active_users
-- ใช้ list active users สำหรับ admin panel
-- Frontend: user-management.tsx | Python: supabase.table("v_active_users")
-- =============================================================================
CREATE OR REPLACE VIEW v_active_users AS
SELECT
  id,
  email,
  full_name,
  role,
  avatar_url,
  last_login_at,
  created_at,
  updated_at
FROM user_profiles
WHERE is_active = true;

-- =============================================================================
-- FUNCTION: get_crop_citations(crop_uuid)
-- ดึง research citations ทั้งหมดของ crop (เรียงตามปีใหม่สุด)
-- Python: supabase.rpc("get_crop_citations", {"crop_uuid": "..."})
-- TypeScript: supabase.rpc("get_crop_citations", { crop_uuid: "..." })
-- =============================================================================
CREATE OR REPLACE FUNCTION get_crop_citations(crop_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  authors text,
  journal text,
  year int,
  doi text,
  summary text,
  confidence_score numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    rc.id, rc.title, rc.authors, rc.journal, rc.year,
    rc.doi, rc.summary, rc.confidence_score, rc.created_at
  FROM research_citations rc
  WHERE rc.crop_id = crop_uuid
  ORDER BY rc.year DESC, rc.created_at DESC;
$$;

-- =============================================================================
-- FUNCTION: get_paper_timeline(submission_uuid)
-- ดึง audit log timeline ของ paper submission (เรียงตามเวลา)
-- Python: supabase.rpc("get_paper_timeline", {"submission_uuid": "..."})
-- TypeScript: supabase.rpc("get_paper_timeline", { submission_uuid: "..." })
-- =============================================================================
CREATE OR REPLACE FUNCTION get_paper_timeline(submission_uuid uuid)
RETURNS TABLE (
  id uuid,
  action text,
  actor_email text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    pal.id, pal.action, pal.actor_email, pal.details, pal.created_at
  FROM paper_audit_log pal
  WHERE pal.submission_id = submission_uuid
  ORDER BY pal.created_at ASC;
$$;
