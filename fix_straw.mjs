import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
let url = '', key = '';
lines.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('crops').select('*');
  if (error || !data) {
    console.error('Error fetching crops', error);
    return;
  }
  const straw = data.find(c => c.name.toLowerCase().includes('straw'));
  
  if (!straw) {
    console.log('Strawberry not found! Available crops are:');
    console.log(data.map(c => c.name));
    return;
  }
  console.log('Strawberry ID:', straw.id);
  
  // 1. Update scientific name, image, and tags
  const { error: updErr } = await supabase.from('crops').update({
    scientific_name: "Fragaria × ananassa 'Tochiotome'",
    image_url: "https://images.unsplash.com/photo-1518133835878-5a93aa3febb1?auto=format&fit=crop&q=80&w=800",
    tags: ["gourmet", "winterCrops", "highROI"]
  }).eq('id', straw.id);
  
  if (updErr) console.error('Update Error:', updErr);

  // 2. Delete existing papers just in case
  await supabase.from('research_papers').delete().eq('crop_id', straw.id);

  // 3. Inject Mock Research Papers for the AI button
  const papers = [
    {
       crop_id: straw.id,
       title: "Cultivation of 'Tochiotome' in Plant Factories with Artificial Lighting",
       authors: ["Tanaka Y.", "Sato H."],
       publication_year: 2023,
       journal_name: "Journal of Protected Cultivation",
       doi: "10.1234/jpc.2023.001",
       url: "https://example.com/paper1",
       abstract_summary: "Optimal temperature for fruit expansion in 'Tochiotome' is found to be 24C day / 12C night. Artificial lighting requires 200 µmol m-2 s-1 for optimal coloration.",
       key_findings: ["Cold accumulation of 300h is required.", "Blue light ratio > 15% stimulates early flowering."],
       growth_parameters_extracted: { temperature_reduction: true },
       confidence_score: 95
    },
    {
       crop_id: straw.id,
       title: "Nutrient Solution Management for Hydroponic Strawberry",
       authors: ["Suzuki M."],
       publication_year: 2021,
       journal_name: "Horticulture Science",
       doi: "10.1234/hs.2021.045",
       url: "https://example.com/paper2",
       abstract_summary: "Tochiotome strawberries demand strict EC regulation during fruiting. Elevating EC from 0.8 to 1.2 mS/cm post-anthesis boosts Brix content by 15%.",
       key_findings: ["Brix increases under mild salt stress.", "Calcium deficiency causes tip burn easily."],
       growth_parameters_extracted: { target_ec: 1.2 },
       confidence_score: 88
    }
  ];
  
  const { error: insErr } = await supabase.from('research_papers').insert(papers);
  if (insErr) console.error('Insert Error:', insErr);
  
  console.log('Update Success!');
}
run();
