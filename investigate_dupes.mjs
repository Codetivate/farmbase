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

async function investigate() {
  const duplicatedIds = [
    '740c3fc6-b7a8-4578-88ac-4aafbf21366a',       
    '87a6ec1c-6582-445d-8546-57ef73fd93eb',       
    '096f6dd2-ba85-42f6-a33f-ff51af45e091',       
    '7de66def-4dc9-48eb-8ccc-4a65e1b92a3e'
  ];
  const { data } = await supabase.from('research_citations').select('id, submission_id, title').in('submission_id', duplicatedIds);
  console.log(data);
}

investigate().catch(console.error);
