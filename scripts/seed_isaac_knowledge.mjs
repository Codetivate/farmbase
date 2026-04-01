import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    acc[key.trim()] = values.join('=').trim();
  }
  return acc;
}, {});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedIsaacSimDocs() {
  console.log('Fetching target crop ID (Strawberry - Tochiotome)...');
  const { data: crops, error: cropErr } = await supabase
    .from('crops')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (cropErr || !crops || crops.length === 0) {
    console.error('Failed to get crop ID:', cropErr);
    return;
  }
  const cropId = crops[0].id;
  
  const isaacDoi = 'omniverse-isaac-sim-5.1.0';
  
  console.log(`Checking if Isaac Sim knowledge already seeded (DOI: ${isaacDoi})...`);
  const { data: existing } = await supabase
    .from('paper_submissions')
    .select('id')
    .eq('doi', isaacDoi)
    .single();
    
  if (existing) {
    console.log('Isaac Sim documentation is already safely stored in the database! Skipping seed.');
    return;
  }

  console.log('Injecting Isaac Sim 5.1.0 Developer Reference into paper_submissions...');
  
  const title = 'NVIDIA Isaac Sim 5.1.0 Developer Reference: Foundational Robotics Framework';
  const authors = 'NVIDIA Omniverse';
  const journal = 'Isaac Sim Reference Architecture';
  const year = 2024;
  const abstractText = "A comprehensive architecture and implementation framework for developing, testing, and deploying high-fidelity robotic simulations. Key components include Cortex Behavior Trees for high-level decision making, Lula Kinematics (RMPflow) for reactive path planning, RTX Camera and non-visual sensors (Lidar/Ultrasonic), and a vast library of SimReady Prop and Environment Assets. Crucial for transferring AI reinforcement learning and digital twin models from simulation to reality (Contractor-Ready). Also includes documentation on ROS 2 integration, USD hierarchy, and Omnigraph execution.";
  const aiSummary = "คู่มือสถาปัตยกรรมหลักสำหรับตั้งค่าและรัน Digital Twin 4D ในโปรเจค (NVIDIA Isaac Sim 5.1.0) ครอบคลุมชุด Sensor เสมือนจริง ระบบนำทางอัจฉริยะ (RMPflow/Lula IK) การจัดการแขนกล และเซ็ตอัพระบบสภาพแวดล้อม (PFAL Assets/SimReady Props) เพื่อสกัด Environment Parameters ที่แม่นยำออกมาประยุกต์ใช้ในโลกจริง";
  
  const { data: psData, error: psErr } = await supabase
    .from('paper_submissions')
    .insert([{
      doi: isaacDoi,
      url: 'https://docs.isaacsim.omniverse.nvidia.com/5.1.0/',
      crop_id: cropId,
      submitted_by_email: 'system@farmbase.ai',
      title: title,
      authors: authors,
      year: year,
      journal: journal,
      abstract_text: abstractText,
      ai_summary: aiSummary,
      ai_confidence_score: 99,
      ai_relevance_tags: ['verified', 'isaac_sim', 'robotics', 'simulation', 'digital_twin'],
      ai_model_used: 'omni-engineer',
      status: 'approved',
      error_message: '',
      priority: 'high'
    }])
    .select();

  if (psErr || !psData || psData.length === 0) {
    console.error('Failed to insert paper_submissions:', psErr);
    return;
  }
  
  const newSubId = psData[0].id;
  console.log(`Successfully injected into paper_submissions. ID: ${newSubId}`);
  
  console.log('Injecting into research_citations...');
  const { error: rcErr } = await supabase
    .from('research_citations')
    .insert([{
      submission_id: newSubId,
      crop_id: cropId,
      title: title,
      authors: authors,
      year: year,
      journal: journal,
      doi: isaacDoi,
      summary: aiSummary,
      confidence_score: 99
    }]);
    
  if (rcErr) {
    console.error('Failed to insert into research_citations:', rcErr);
    return;
  }
  
  console.log('Isaac Sim Framework successfully ingested as Research Paper!');
  
  // Verification count
  const { count } = await supabase
    .from('v_unified_research_papers')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Total Unified Research Papers Count is now: ${count}`);
}

seedIsaacSimDocs().catch(console.error);
