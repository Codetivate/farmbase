import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function check() {
  const { count: cCount } = await supabase.from('research_citations').select('*', { count: 'exact', head: true });
  const { count: sCount } = await supabase.from('paper_submissions').select('*', { count: 'exact', head: true });
  console.log('research_citations count:', cCount);
  console.log('paper_submissions count:', sCount);
}

check().catch(console.error);
