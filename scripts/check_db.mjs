import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const svcMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch ? urlMatch[1].replace(/['"]/g, '').trim() : '';
const SUPABASE_KEY = svcMatch ? svcMatch[1].replace(/['"]/g, '').trim() : (keyMatch ? keyMatch[1].replace(/['"]/g, '').trim() : '');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('crops')
    .select('name');
  console.log(data, error);
}

check();
