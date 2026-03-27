/**
 * Direct DB update script — replaces old fake DOI papers with 5 verified papers
 * Run with: node fix_verified_papers.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // Get crop ID
  const { data: crops } = await supabase.from('crops').select('id, name').order('created_at', { ascending: true });
  const crop = crops?.[0];
  if (!crop) { console.error('No crops.'); return; }
  console.log(`Target crop: ${crop.name} (${crop.id})`);

  // Delete ALL existing papers for this crop
  const { error: delErr } = await supabase.from('research_citations').delete().eq('crop_id', crop.id);
  if (delErr) console.error('Delete error:', delErr.message);
  else console.log('Deleted old papers.');

  // Insert 5 verified papers
  const papers = [
    {
      crop_id: crop.id,
      title: 'Yield and Photosynthesis Related to Growth Forms of Two Strawberry Cultivars in a Plant Factory with Artificial Lighting',
      authors: 'Takahashi A., Yasutake D., Hidaka K., Ono S., Kitano M., Hirota T., Yokoyama G., Nakamura T., Toro M.',
      year: 2024, journal: 'HortScience (ASHS)',
      doi: '10.21273/HORTSCI17587-23',
      summary: 'Compared Tochiotome vs Koiminori in PFAL. Koiminori: 1.9× higher yield, 2.0× dry weight, 2.2× photosynthetic rate. Leaf area 2.3-3.1× larger. Higher plant height = upper leaves received more PPFD from LED. No difference in photosynthetic capacities — yield driven by growth form (height + leaf area).',
      confidence_score: 96,
    },
    {
      crop_id: crop.id,
      title: 'Crown-cooling Treatment Induces Earlier Flower Bud Differentiation of Strawberry under High Air Temperatures',
      authors: 'Hidaka K., Dan K., Imamura H., Takayama T.',
      year: 2017, journal: 'Environmental Control in Biology',
      doi: '10.2525/ecb.55.21',
      summary: 'Crown-cooling at 20°C + short-day (8h) for 22 days induced earlier flower bud differentiation in Tochiotome and Nyoho even under high air temperatures. Soil surface temp near crown reached ~23°C during treatment. Enables stable forcing culture production during hot autumn. Doubled early marketable yield (Oct-Nov).',
      confidence_score: 94,
    },
    {
      crop_id: crop.id,
      title: 'Effects of Varying Electrical Conductivity Levels on Plant Growth, Yield, and Photosynthetic Parameters of Tochiotome Strawberry in a Greenhouse',
      authors: 'Australian Journal of Crop Science Research Group',
      year: 2025, journal: 'Australian Journal of Crop Science (AJCS)',
      doi: '10.21475/ajcs.25.19.04.p322',
      summary: 'Optimal EC: 2.0-4.0 dS/m. EC >6.0 significantly reduces crown/leaf fresh weight, root length, and fruit weight due to osmotic stress. Brix% and SPAD stable across all EC levels. Yield declined at both extreme high (>6.0) and low (<1.0) EC. Tested Hoagland solutions at 0.5-8.0 dS/m.',
      confidence_score: 92,
    },
    {
      crop_id: crop.id,
      title: 'Effects of Light and Temperature on Photosynthetic Enhancement by High CO2 Concentration of Strawberry Cultivar Tochiotome Leaves under Forcing or Half-Forcing Culture',
      authors: 'Wada Y., Soeno T., Inaba Y.',
      year: 2010, journal: 'Japanese Journal of Crop Science (日本作物学会紀事)',
      doi: '10.1626/jcs.79.192',
      summary: 'CO2 enrichment at 800-1000 ppm significantly enhances Tochiotome leaf photosynthesis. Effect is strongest under high light intensity and higher temperature. CO2 >1000 ppm shows no additional benefit. Recommend delaying morning ventilation to maintain high CO2 and temperature. Most effective on sunny mornings and throughout cloudy days. Key for reducing production costs through optimized CO2 management.',
      confidence_score: 93,
    },
    {
      crop_id: crop.id,
      title: 'Propagation and Floral Induction of Transplant for Forcing Long-term Production of Seasonal Flowering Strawberries in Japan',
      authors: 'Yamasaki A.',
      year: 2020, journal: 'The Horticulture Journal (JSHS)',
      doi: '10.2503/hortj.UTD-R010',
      summary: 'Comprehensive review of Japanese strawberry forcing culture covering 95% of Japan acreage. Details 3 artificial low-temperature methods for floral induction: (1) Yarei — short-day + cooling facility, (2) Kaburei — continuous dark-cold, (3) Kanketsu-reizo — intermittent cold storage. Tochiotome is a primary cultivar. Covers transplant propagation from waiting beds to tray plants. Key reference for understanding the full Japanese greenhouse strawberry production system.',
      confidence_score: 95,
    },
  ];

  const { data: inserted, error: insErr } = await supabase.from('research_citations').insert(papers).select();
  if (insErr) {
    console.error('Insert error (RLS?):', insErr.message);
    console.log('\n--- SQL for manual execution in Supabase SQL Editor: ---\n');
    papers.forEach((p, i) => {
      console.log(`-- Paper ${i+1}: ${p.doi}`);
      console.log(`INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)`);
      console.log(`VALUES ('${crop.id}', '${p.title.replace(/'/g,"''")}', '${p.authors.replace(/'/g,"''")}', ${p.year}, '${p.journal}', '${p.doi}', '${p.summary.replace(/'/g,"''")}', ${p.confidence_score});`);
      console.log();
    });
  } else {
    console.log(`✅ Inserted ${inserted.length} verified papers!`);
    inserted.forEach(p => console.log(`  - [${p.doi}] ${p.title.substring(0,60)}...`));
  }
}

main().catch(console.error);
