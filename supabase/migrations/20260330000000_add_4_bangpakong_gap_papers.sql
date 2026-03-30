-- =============================================================================
-- Add 4 gap-filling papers for Bangpakong, Chachoengsao deployment
-- Dimensions: Water/Sodium, Economics/Resource, LCA/Sustainability, Post-Harvest
-- All DOIs verified via CrossRef ✓
-- Total papers after this: 17 (13 existing + 4 new)
-- =============================================================================

DO $$
DECLARE
  target_crop_id uuid;
  new_sub_id uuid;
BEGIN
  SELECT id INTO target_crop_id FROM crops ORDER BY created_at ASC LIMIT 1;
  IF target_crop_id IS NULL THEN RETURN; END IF;

  -- =========================================================================
  -- Paper 14: Sodium Management in Closed-Loop Hydroponics
  -- DOI VERIFIED: https://doi.org/10.1016/j.agwat.2024.108968
  -- Dimension: Water Quality / Saline Intrusion Mitigation
  -- Critical for: Bangpakong — saltwater intrusion Jan-Apr
  -- =========================================================================
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'Development and validation of an innovative algorithm for sodium accumulation management in closed-loop soilless culture systems',
    'Giannothanasis E., Savvas D., Danai A., Leonardi C.',
    2024, 'Agricultural Water Management', '10.1016/j.agwat.2024.108968',
    'พัฒนาอัลกอริทึมจัดการ Na⁺ ใน closed-loop hydroponic. ใช้ ion-selective electrodes ตรวจวัด real-time. คำนวณจุด flush/drain เพื่อป้องกัน EC สะสมเกิน. NUE สูงขึ้น 88-94% vs. open-loop. สตรอว์เบอร์รีทนเค็มได้แค่ ~2.0 dS/m — ต้องมี algorithm จัดการ Na⁺ โดยเฉพาะเมื่อใช้น้ำจากพื้นที่น้ำเค็มหนุน เช่น บางปะกง',
    94);

  -- Backfill paper_submissions for Paper 14
  INSERT INTO paper_submissions (
    doi, url, crop_id, submitted_by_email,
    title, authors, year, journal,
    abstract_text, ai_summary, ai_confidence_score,
    ai_relevance_tags, ai_model_used,
    status, error_message, priority
  ) VALUES (
    '10.1016/j.agwat.2024.108968', '',
    target_crop_id, 'system@farmbase.ai',
    'Development and validation of an innovative algorithm for sodium accumulation management in closed-loop soilless culture systems',
    'Giannothanasis E., Savvas D., Danai A., Leonardi C.',
    2024, 'Agricultural Water Management',
    '', 'อัลกอริทึมจัดการ Na⁺ ในระบบ closed-loop สำหรับพื้นที่น้ำเค็มหนุน', 94,
    ARRAY['verified','water_quality','bangpakong'], 'engineer-seed',
    'approved', '', 'normal'
  ) RETURNING id INTO new_sub_id;

  UPDATE research_citations SET submission_id = new_sub_id
  WHERE crop_id = target_crop_id AND doi = '10.1016/j.agwat.2024.108968';

  -- =========================================================================
  -- Paper 15: PFAL vs. Greenhouse Resource Use Efficiency
  -- DOI VERIFIED: https://doi.org/10.1016/j.agsy.2017.11.003
  -- Dimension: Economics / Energy / Feasibility
  -- Critical for: Cost analysis before investment
  -- =========================================================================
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'Plant factories versus greenhouses: Comparison of resource use efficiency',
    'Graamans L., Baeza E., van den Dobbelsteen A., Tsafaras I., Stanghellini C.',
    2018, 'Agricultural Systems', '10.1016/j.agsy.2017.11.003',
    'เปรียบเทียบ PFAL vs. Greenhouse หลายภูมิอากาศ. PFAL ใช้พลังงาน 247 kWh/kg dry weight vs. GH 70-111 kWh แต่ใช้น้ำ/ที่ดินน้อยกว่ามาก. ในเขตร้อนชื้น cooling load สูงเป็นพิเศษ. เป็น benchmark สำหรับคำนวณว่า PFAL ในไทยคุ้มทุนหรือไม่ โดยพิจารณาค่าไฟ ~4 บาท/kWh',
    96);

  INSERT INTO paper_submissions (
    doi, url, crop_id, submitted_by_email,
    title, authors, year, journal,
    abstract_text, ai_summary, ai_confidence_score,
    ai_relevance_tags, ai_model_used,
    status, error_message, priority
  ) VALUES (
    '10.1016/j.agsy.2017.11.003', '',
    target_crop_id, 'system@farmbase.ai',
    'Plant factories versus greenhouses: Comparison of resource use efficiency',
    'Graamans L., Baeza E., van den Dobbelsteen A., Tsafaras I., Stanghellini C.',
    2018, 'Agricultural Systems',
    '', 'เปรียบเทียบ PFAL vs. GH ด้านพลังงาน น้ำ ที่ดิน — benchmark สำหรับเขตร้อน', 96,
    ARRAY['verified','economics','energy'], 'engineer-seed',
    'approved', '', 'normal'
  ) RETURNING id INTO new_sub_id;

  UPDATE research_citations SET submission_id = new_sub_id
  WHERE crop_id = target_crop_id AND doi = '10.1016/j.agsy.2017.11.003';

  -- =========================================================================
  -- Paper 16: LCA / Sustainability of Plant Factory
  -- DOI VERIFIED: https://doi.org/10.1016/j.jclepro.2018.03.110
  -- Dimension: Life Cycle Assessment / Environmental Impact
  -- =========================================================================
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'Environmental and resource use analysis of plant factories with energy technology options: A case study in Japan',
    'Kikuchi Y., Kanematsu Y., Yoshikawa N., Okubo T., Takagaki M.',
    2018, 'Journal of Cleaner Production', '10.1016/j.jclepro.2018.03.110',
    'LCA เต็มรูปแบบของ Plant Factory ญี่ปุ่น. เปรียบเทียบ PFAL vs. PFSL vs. เกษตรทั่วไป. PFAL ลด land/water/phosphorus ใช้ได้ดี แต่ energy เป็นจุดอ่อนหลัก. การเสริม renewable energy (solar) ช่วยลด footprint ได้มาก. ช่วย justify ว่า indoor farm มีข้อดีอะไร vs. ปลูกบนดินสำหรับนักลงทุน/ธนาคาร',
    93);

  INSERT INTO paper_submissions (
    doi, url, crop_id, submitted_by_email,
    title, authors, year, journal,
    abstract_text, ai_summary, ai_confidence_score,
    ai_relevance_tags, ai_model_used,
    status, error_message, priority
  ) VALUES (
    '10.1016/j.jclepro.2018.03.110', '',
    target_crop_id, 'system@farmbase.ai',
    'Environmental and resource use analysis of plant factories with energy technology options: A case study in Japan',
    'Kikuchi Y., Kanematsu Y., Yoshikawa N., Okubo T., Takagaki M.',
    2018, 'Journal of Cleaner Production',
    '', 'LCA Plant Factory ญี่ปุ่น — เปรียบเทียบ PFAL vs. เกษตรทั่วไป ด้านสิ่งแวดล้อม', 93,
    ARRAY['verified','sustainability','lca'], 'engineer-seed',
    'approved', '', 'normal'
  ) RETURNING id INTO new_sub_id;

  UPDATE research_citations SET submission_id = new_sub_id
  WHERE crop_id = target_crop_id AND doi = '10.1016/j.jclepro.2018.03.110';

  -- =========================================================================
  -- Paper 17: Post-Harvest / Shelf Life / Cold Chain
  -- DOI VERIFIED: https://doi.org/10.1111/1541-4337.13417
  -- Dimension: Post-Harvest Quality & Logistics
  -- Critical for: Bangpakong → Bangkok (60km) supply chain
  -- =========================================================================
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'Advances in strawberry postharvest preservation and packaging: A comprehensive review',
    'Priyadarshi R., Jayakumar A., Krebs de Souza C., Rhim J.W.',
    2024, 'Comprehensive Reviews in Food Science and Food Safety', '10.1111/1541-4337.13417',
    'Review ครอบคลุมเทคนิค post-harvest สตรอว์เบอร์รี: MAP (Modified Atmosphere Packaging), 1-MCP, ozone treatment, edible coatings (chitosan), cold chain logistics. สตรอว์เบอร์รีเน่าเร็ว 2-3 วัน ต้องมีระบบส่งที่ดี. เหมาะกับเส้นทาง บางปะกง→กทม. 60km ต้องรักษา cold chain ตลอด',
    95);

  INSERT INTO paper_submissions (
    doi, url, crop_id, submitted_by_email,
    title, authors, year, journal,
    abstract_text, ai_summary, ai_confidence_score,
    ai_relevance_tags, ai_model_used,
    status, error_message, priority
  ) VALUES (
    '10.1111/1541-4337.13417', '',
    target_crop_id, 'system@farmbase.ai',
    'Advances in strawberry postharvest preservation and packaging: A comprehensive review',
    'Priyadarshi R., Jayakumar A., Krebs de Souza C., Rhim J.W.',
    2024, 'Comprehensive Reviews in Food Science and Food Safety',
    '', 'Review เทคนิค post-harvest สตรอว์เบอร์รี: MAP, 1-MCP, ozone, cold chain', 95,
    ARRAY['verified','post_harvest','cold_chain'], 'engineer-seed',
    'approved', '', 'normal'
  ) RETURNING id INTO new_sub_id;

  UPDATE research_citations SET submission_id = new_sub_id
  WHERE crop_id = target_crop_id AND doi = '10.1111/1541-4337.13417';

  RAISE NOTICE 'Added 4 Bangpakong gap papers (Water/Na, Economics, LCA, Post-Harvest). Total: 17 papers for crop %', target_crop_id;
END $$;
