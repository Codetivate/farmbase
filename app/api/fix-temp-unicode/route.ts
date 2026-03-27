import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    const { data: crops } = await supabase.from('crops').select('id, name, optimal_conditions');

    let updatedCount = 0;
    const updates = [];

    for (const crop of crops || []) {
      if (crop.optimal_conditions && crop.optimal_conditions.temperature) {
        if (crop.optimal_conditions.temperature.unit === '\\u00B0C' || crop.optimal_conditions.temperature.unit === '\\u00b0C' || crop.optimal_conditions.temperature.unit.includes('u00')) {
          const updatedConditions = { ...crop.optimal_conditions };
          updatedConditions.temperature.unit = '°C';
          updates.push({ id: crop.id, optimal_conditions: updatedConditions, name: crop.name });
        }
      }
    }

    // Process updates
    for (const update of updates) {
      const { error } = await supabase
        .from('crops')
        .update({ optimal_conditions: update.optimal_conditions })
        .eq('id', update.id);
      
      if (!error) updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} crops. Temp unit fixed.`,
      fixed_crops: updates.map(u => u.name)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
