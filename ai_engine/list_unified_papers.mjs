import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

const envContent = fs.readFileSync(envPath, 'utf-8');
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

async function checkUnifiedPapers() {
  console.log('Fetching unified research papers...');
  
  // Test reading from the new view
  const { data, error, count } = await supabase
    .from('v_unified_research_papers')
    .select('*', { count: 'exact' });
    
  if (error) {
    console.error('Error fetching papers:', error);
    return;
  }
  
  console.log(`Successfully fetched ${count} unified papers!\n`);
  
  if (data && data.length > 0) {
    console.log('--- Sample Paper (from unified view) ---');
    console.log(`Title: ${data[0].title}`);
    console.log(`Crop: ${data[0].crop_name}`);
    console.log(`Doi: ${data[0].doi}`);
    console.log(`Authors: ${data[0].authors}`);
    console.log(`Abstract: ${data[0].abstract_text?.substring(0, 150)}...`);
    console.log(`Tags: ${data[0].tags?.join(', ')}`);
    console.log(`AI Confidence: ${data[0].confidence_score}`);
    console.log(`Status: ${data[0].processing_status}`);
    console.log('--------------------------------------');
  }
}

checkUnifiedPapers().catch(console.error);
