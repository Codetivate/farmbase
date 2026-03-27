import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTemperatureUnit() {
  const { data: crops, error } = await supabase.from('crops').select('id, optimal_conditions');
  if (error) {
    console.error('Error fetching crops:', error);
    return;
  }

  let updatedCount = 0;
  for (const crop of crops) {
    if (crop.optimal_conditions && crop.optimal_conditions.temperature) {
      if (crop.optimal_conditions.temperature.unit === '\\u00B0C' || crop.optimal_conditions.temperature.unit === '\\u00b0C') {
        const updatedConditions = { ...crop.optimal_conditions };
        updatedConditions.temperature.unit = '°C';

        const { error: updateError } = await supabase
          .from('crops')
          .update({ optimal_conditions: updatedConditions })
          .eq('id', crop.id);

        if (updateError) {
          console.error(`Error updating crop ${crop.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Updated crop ${crop.id}`);
        }
      }
    }
  }
  console.log(`Fix complete. Updated ${updatedCount} crops.`);
}

fixTemperatureUnit();
