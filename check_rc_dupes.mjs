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
  const { data: rcData } = await supabase.from('research_citations').select('id, submission_id');
  const counts = {};
  rcData.forEach(row => {
     if (row.submission_id) {
       counts[row.submission_id] = (counts[row.submission_id] || 0) + 1;
     }
  });
  
  const duplicatedSubIds = Object.keys(counts).filter(k => counts[k] > 1);
  console.log('Duplicated submission_ids in research_citations:', duplicatedSubIds);
  
  if (duplicatedSubIds.length > 0) {
    for (const subId of duplicatedSubIds) {
      const { data: dupes } = await supabase.from('research_citations').select('id, title, doi').eq('submission_id', subId);
      console.log('For subId', subId, 'found entries:', dupes);
    }
  }

  // Also check paper_submissions themselves for duplicates of DOI
  const { data: psData } = await supabase.from('paper_submissions').select('id, doi');
  const psCounts = {};
  psData.forEach(row => {
     if(row.doi) {
         psCounts[row.doi] = (psCounts[row.doi] || 0) + 1;
     }
  });
  const duplicatedDois = Object.keys(psCounts).filter(k => psCounts[k] > 1);
  console.log('Duplicated DOIs in paper_submissions:', duplicatedDois);
}

investigate().catch(console.error);
