import fs from 'fs';
import https from 'https';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch ? urlMatch[1].trim() : '';
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : '';

console.log("URL:", SUPABASE_URL);

async function test() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/crops?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.log("Error status:", res.status, err);
      return;
    }
    
    const data = await res.json();
    console.log("Crops Status: OK. Count:", data.length);
    if(data.length > 0) {
      console.log("First crop:", data[0].name, "is_published:", data[0].is_published);
    }
    
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
