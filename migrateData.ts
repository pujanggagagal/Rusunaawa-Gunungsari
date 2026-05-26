import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { INITIAL_RESIDENTS, INITIAL_COORDINATORS, INITIAL_BILLING_RECORDS, INITIAL_FINANCE_LOGS } from './src/data';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  console.log('Memulai migrasi data ke Supabase...');

  // Helper untuk mengubah key menjadi huruf kecil
  const toLowerCaseKeys = (obj: any) => {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
  };

  const residentsLower = INITIAL_RESIDENTS.map(toLowerCaseKeys);
  const coordsLower = INITIAL_COORDINATORS.map(toLowerCaseKeys);
  const billingLower = INITIAL_BILLING_RECORDS.map(toLowerCaseKeys);
  const financeLower = INITIAL_FINANCE_LOGS.map(toLowerCaseKeys);

  // 1. Migrasi Warga
  console.log(`Mengirim ${residentsLower.length} data Warga...`);
  const { error: resErr } = await supabase.from('residents').upsert(residentsLower);
  if (resErr) console.error('Error migrating residents:', resErr);
  else console.log('✓ Data Warga berhasil dipindahkan.');

  // 2. Migrasi Koordinator
  console.log(`Mengirim ${coordsLower.length} data Koordinator...`);
  const { error: coordErr } = await supabase.from('coordinators').upsert(coordsLower);
  if (coordErr) console.error('Error migrating coordinators:', coordErr);
  else console.log('✓ Data Koordinator berhasil dipindahkan.');

  // 3. Migrasi Billing
  console.log(`Mengirim ${billingLower.length} data Tagihan...`);
  const { error: billErr } = await supabase.from('billing').upsert(billingLower);
  if (billErr) console.error('Error migrating billing:', billErr);
  else console.log('✓ Data Tagihan berhasil dipindahkan.');

  // 4. Migrasi Keuangan
  console.log(`Mengirim ${financeLower.length} data Kas Keuangan...`);
  const { error: finErr } = await supabase.from('finance_logs').upsert(financeLower);
  if (finErr) console.error('Error migrating finance:', finErr);
  else console.log('✓ Data Buku Kas berhasil dipindahkan.');

  console.log('MIGRASI SELESAI!');
}

migrateData();
