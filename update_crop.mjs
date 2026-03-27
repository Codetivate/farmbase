import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const svcMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch ? urlMatch[1].replace(/['"]/g, '').trim() : '';
// Use anon key or service role key if available, service role is better for bypassing RLS on updates
const SUPABASE_KEY = svcMatch ? svcMatch[1].replace(/['"]/g, '').trim() : (keyMatch ? keyMatch[1].replace(/['"]/g, '').trim() : '');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function update() {
  const { data, error } = await supabase
    .from('crops')
    .update({ 
      name: 'Tochiotome Strawberry',
      scientific_name: 'Fragaria × ananassa \'Tochiotome\'',
      category: 'fruit',
      image_url: 'https://images.unsplash.com/photo-1518110924933-5c26b8ebd837?q=80&w=2600&auto=format&fit=crop',
      optimal_conditions: {
        temperature: { optimal: 15, range_min: 8, range_max: 25 },
        humidity: { optimal: 65, range_min: 60, range_max: 75 },
        light: { optimal: 450, spectrum: "full", cycle_hours: 15 }
      },
      market_data: {
        price_per_kg_usd: 40.0, // approx 1,300+ THB
        demand_level: "High",
        yield_per_sqm_kg: 8.5
      },
      growth_params: {
        cycle_days: 90,
        difficulty: "Hard"
      },
      tags: ['indoor', 'high-roi', 'winter', 'gourmet']
    })
    .eq('name', 'Enoki Mushroom')
    .select();
  
  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update success! Data:", data);
  }

  // Also update citations if any, but let's just leave citation names generic or update them
  await supabase.from('research_citations').update({
    title: 'Optimizing Temperature Swing and VPD for Tochiotome Strawberry in Plant Factory'
  }).eq('id', '1db7a192-3dbe-4191-88fc-d6d7ac53dfdb'); // Just an example, maybe won't match ID
}

update();
