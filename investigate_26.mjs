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
  const { count: psCount } = await supabase.from('paper_submissions').select('id', { count: 'exact', head: true });
  const { count: rcCount } = await supabase.from('research_citations').select('id', { count: 'exact', head: true });
  const { count: viewCount } = await supabase.from('v_unified_research_papers').select('*', { count: 'exact', head: true });
  
  console.log(`paper_submissions rows: ${psCount}`);
  console.log(`research_citations rows: ${rcCount}`);
  console.log(`v_unified_research_papers rows: ${viewCount}`);

  // Find duplicates
  const { data: duplicates } = await supabase.rpc('get_duplicates_if_any') // wait we dont have rpc for this
    .select() || {data: []};
  
  // Just fetch all from the view and check if IDs are duplicated
  const { data: viewData } = await supabase.from('v_unified_research_papers').select('submission_id');
  const counts = {};
  viewData.forEach(row => {
     counts[row.submission_id] = (counts[row.submission_id] || 0) + 1;
  });
  
  const duplicatedIds = Object.keys(counts).filter(k => counts[k] > 1);
  if (duplicatedIds.length > 0) {
    console.log('Duplicated submission IDs in view:', duplicatedIds);
    // Fetch details
    const { data: details } = await supabase.from('v_unified_research_papers').select('title').in('submission_id', duplicatedIds);
    console.log('Duplicated titles:', details.map(d => d.title));
  } else {
    console.log('No duplicates, wait. Let us see if paper_submissions is actually 26 now');
  }

}

investigate().catch(console.error);
