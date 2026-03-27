/*
  # Seed paper_submissions from research_citations + sample paper_feedback
  
  Purpose:
    Connect existing research data to the ศูนย์วิจัย (Research Center) UI.
    The UI reads from paper_submissions and paper_feedback, but those tables
    are currently empty. This migration backfills them from research_citations.
  
  What it does:
    1. For each research_citation, insert a matching paper_submissions row (status='approved')
    2. Update research_citations.submission_id to link back
    3. Insert sample paper_feedback entries for realistic issue tracking demo
*/

-- Step 1: Backfill paper_submissions from research_citations
DO $$
DECLARE
  rec RECORD;
  new_sub_id uuid;
BEGIN
  FOR rec IN 
    SELECT * FROM research_citations 
    WHERE submission_id IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Insert into paper_submissions
    INSERT INTO paper_submissions (
      doi, url, crop_id, submitted_by_email,
      title, authors, year, journal,
      abstract_text, ai_summary, ai_confidence_score,
      ai_relevance_tags, ai_model_used,
      status, error_message,
      created_at, updated_at
    ) VALUES (
      COALESCE(rec.doi, ''),
      '',
      rec.crop_id,
      'system@farmbase.ai',
      rec.title,
      rec.authors,
      rec.year,
      rec.journal,
      '',  -- abstract_text
      rec.summary,
      rec.confidence_score,
      ARRAY['verified', 'research'],
      'migration-seed',
      'approved',
      '',
      rec.created_at,
      rec.created_at
    )
    RETURNING id INTO new_sub_id;

    -- Link research_citation back to the submission
    UPDATE research_citations
    SET submission_id = new_sub_id
    WHERE id = rec.id;

    RAISE NOTICE 'Linked citation "%" -> submission %', rec.title, new_sub_id;
  END LOOP;
END $$;

-- Step 2: Insert sample paper_feedback for issue tracking demo
DO $$
DECLARE
  sub1_id uuid;
  sub2_id uuid;
  sub3_id uuid;
BEGIN
  -- Get first 3 submissions (ordered by created_at)
  SELECT id INTO sub1_id FROM paper_submissions ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO sub2_id FROM paper_submissions ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO sub3_id FROM paper_submissions ORDER BY created_at ASC OFFSET 2 LIMIT 1;

  IF sub1_id IS NULL THEN
    RAISE NOTICE 'No submissions found, skipping feedback seed';
    RETURN;
  END IF;

  -- Feedback 1: pending - data accuracy issue
  INSERT INTO paper_feedback (
    submission_id, feedback_type, field_name,
    original_value, suggested_value, feedback_notes,
    reporter_email, severity, status,
    ai_analysis, ai_recommendation, ai_confidence
  ) VALUES (
    sub1_id,
    'data_error',
    'temperature_optimal',
    '25°C',
    '22-24°C',
    'ค่าอุณหภูมิที่เหมาะสมควรเป็น 22-24°C ตามงานวิจัยฉบับนี้ ไม่ใช่ 25°C ที่แสดงอยู่ในระบบ',
    'researcher@farmbase.ai',
    'medium',
    'pending',
    '',
    '',
    0
  );

  -- Feedback 2: ai_triaged - confidence too high
  IF sub2_id IS NOT NULL THEN
    INSERT INTO paper_feedback (
      submission_id, feedback_type, field_name,
      original_value, suggested_value, feedback_notes,
      reporter_email, severity, status,
      ai_analysis, ai_recommendation, ai_confidence
    ) VALUES (
      sub2_id,
      'confidence_too_high',
      'ai_confidence_score',
      '96',
      '85',
      'ค่า Confidence สูงเกินไป เนื่องจากงานวิจัยนี้ทดสอบกับสายพันธุ์เดียว ไม่ได้ครอบคลุมหลายสายพันธุ์',
      'admin@farmbase.ai',
      'low',
      'ai_triaged',
      'AI พบว่า feedback มีความสมเหตุสมผล ควรปรับค่าลง',
      'needs_review',
      72
    );
  END IF;

  -- Feedback 3: resolved - missing info
  IF sub3_id IS NOT NULL THEN
    INSERT INTO paper_feedback (
      submission_id, feedback_type, field_name,
      original_value, suggested_value, feedback_notes,
      reporter_email, severity, status,
      ai_analysis, ai_recommendation, ai_confidence,
      resolved_by_email, resolution_notes, resolved_at
    ) VALUES (
      sub3_id,
      'missing_info',
      'humidity_range',
      '',
      '85-95%',
      'งานวิจัยนี้ไม่ได้ระบุช่วงความชื้นที่เหมาะสม ควรเพิ่มข้อมูลจากหน้า 4 ของ paper',
      'reviewer@farmbase.ai',
      'high',
      'resolved',
      'AI ตรวจสอบแล้วพบข้อมูลในหน้า 4 จริง',
      'auto_fix',
      88,
      'admin@farmbase.ai',
      'เพิ่มข้อมูลความชื้น 85-95% จากหน้า 4 ของ paper แล้ว',
      now() - interval '2 days'
    );
  END IF;

  RAISE NOTICE 'Seeded 3 sample paper_feedback entries';
END $$;
