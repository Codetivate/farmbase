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

async function clearDuplicates() {
  console.log('Finding duplicates in research_citations...');
  
  const duplicatedIds = [
    '740c3fc6-b7a8-4578-88ac-4aafbf21366a',       
    '87a6ec1c-6582-445d-8546-57ef73fd93eb',       
    '096f6dd2-ba85-42f6-a33f-ff51af45e091',       
    '7de66def-4dc9-48eb-8ccc-4a65e1b92a3e'
  ];

  let deletedCount = 0;
  
  for (const subId of duplicatedIds) {
    // Fetch all citations for this submission_id
    const { data: citations } = await supabase
      .from('research_citations')
      .select('id, created_at')
      .eq('submission_id', subId)
      .order('created_at', { ascending: true });
      
    if (citations && citations.length > 1) {
      // Keep the first one, delete the rest
      const idsToDelete = citations.slice(1).map(c => c.id);
      console.log(`Duplicated submission_id: ${subId}`);
      console.log(`Deleting citation IDs:`, idsToDelete);
      
      const { error } = await supabase
        .from('research_citations')
        .delete()
        .in('id', idsToDelete);
        
      if (error) {
        console.error('Error deleting:', error);
      } else {
        deletedCount += idsToDelete.length;
        console.log(`Deleted ${idsToDelete.length} duplicate row(s)`);
      }
    }
  }

  console.log(`\nCleanup complete. Total ${deletedCount} row(s) deleted.`);
  
  // Verify final count
  const { count: viewCount } = await supabase
    .from('v_unified_research_papers')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\nv_unified_research_papers final count: ${viewCount}`);
}

clearDuplicates().catch(console.error);
