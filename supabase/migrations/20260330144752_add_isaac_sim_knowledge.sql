-- Migration: add_isaac_sim_knowledge
-- Description: Ingests the Omniverse Isaac Sim 5.1.0 Reference as a foundational robotics framework "research paper"

DO $$
DECLARE
  target_crop_id uuid;
  new_sub_id uuid;
  isaac_doi text := 'omniverse-isaac-sim-5.1.0';
  target_title text := 'NVIDIA Isaac Sim 5.1.0 Developer Reference: Foundational Robotics Framework';
  target_authors text := 'NVIDIA Omniverse';
  target_journal text := 'Isaac Sim Reference Architecture';
  target_year integer := 2024;
  target_abstract text := 'A comprehensive architecture and implementation framework for developing, testing, and deploying high-fidelity robotic simulations. Key components include Cortex Behavior Trees for high-level decision making, Lula Kinematics (RMPflow) for reactive path planning, RTX Camera and non-visual sensors (Lidar/Ultrasonic), and a vast library of SimReady Prop and Environment Assets. Crucial for transferring AI reinforcement learning and digital twin models from simulation to reality (Contractor-Ready). Also includes documentation on ROS 2 integration, USD hierarchy, and Omnigraph execution.';
  target_summary text := 'คู่มือสถาปัตยกรรมหลักสำหรับตั้งค่าและรัน Digital Twin 4D ในโปรเจค (NVIDIA Isaac Sim 5.1.0) ครอบคลุมชุด Sensor เสมือนจริง ระบบนำทางอัจฉริยะ (RMPflow/Lula IK) การจัดการแขนกล และเซ็ตอัพระบบสภาพแวดล้อม (PFAL Assets/SimReady Props) เพื่อสกัด Environment Parameters ที่แม่นยำออกมาประยุกต์ใช้ในโลกจริง';
BEGIN
  -- Get the target crop (Strawberry)
  SELECT id INTO target_crop_id FROM crops ORDER BY created_at ASC LIMIT 1;
  IF target_crop_id IS NULL THEN RETURN; END IF;

  -- Ensure it doesn't already exist
  IF EXISTS (SELECT 1 FROM paper_submissions WHERE doi = isaac_doi) THEN
    -- If it exists, update it instead of re-inserting
    UPDATE paper_submissions
    SET title = target_title, abstract_text = target_abstract, ai_summary = target_summary
    WHERE doi = isaac_doi;
    RETURN;
  END IF;

  -- 1. Insert into paper_submissions
  INSERT INTO paper_submissions (
    doi, url, crop_id, submitted_by_email,
    title, authors, year, journal,
    abstract_text, ai_summary, ai_confidence_score,
    ai_relevance_tags, ai_model_used,
    status, error_message, priority
  ) VALUES (
    isaac_doi, 'https://docs.isaacsim.omniverse.nvidia.com/5.1.0/', target_crop_id, 'system@farmbase.ai',
    target_title, target_authors, target_year, target_journal,
    target_abstract, target_summary, 99,
    ARRAY['verified', 'isaac_sim', 'robotics', 'simulation', 'digital_twin'], 'omni-engineer',
    'approved', '', 'high'
  ) RETURNING id INTO new_sub_id;

  -- 2. Insert into research_citations
  INSERT INTO research_citations (
    submission_id, crop_id, title, authors, year, journal, doi, summary, confidence_score
  ) VALUES (
    new_sub_id, target_crop_id, target_title, target_authors, target_year, target_journal,
    isaac_doi, target_summary, 99
  );

  RAISE NOTICE 'Isaac Sim 5.1.0 Knowledge Successfully Ingested as Paper ID: %', new_sub_id;
END $$;
