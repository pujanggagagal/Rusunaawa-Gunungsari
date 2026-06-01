import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Initialize Supabase
const envText = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envText.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('Supabase credentials not found in .env.local!');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Memuat data warga dari database...');
  const { data: residents, error: resErr } = await supabase.from('residents').select('*');
  if (resErr || !residents) {
    console.error('Error fetching residents:', resErr);
    return;
  }
  console.log(`Berhasil memuat ${residents.length} data warga.`);

  // Create a map of formatted unit -> resident details
  const residentMap = {};
  residents.forEach(r => {
    // database keys are lowercase, let's map safely
    const unitVal = r.unit || '';
    const cleanUnit = unitVal.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    residentMap[cleanUnit] = r;
  });

  const files = [
    'lantai 1 mei 2026.csv',
    'lantai 2 mei 2026.csv',
    'lantai 3 mei 2026.csv',
    'lantai 4 mei 2026.csv',
    'lantai 5 mei 2026.csv'
  ];

  let updateCountResidents = 0;
  let updateCountBilling = 0;

  for (const filename of files) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`Berkas tidak ditemukan: ${filename}`);
      continue;
    }

    console.log(`Memproses berkas: ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    // Skip header line (i = 1)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 4) continue;

      const rawUnit = parts[0].trim();
      const rawName = parts[1].trim();
      const rawMeterApril = parts[2].trim();
      const rawMeterMei = parts[3].trim();
      const rawUsage = parts[4] ? parts[4].trim() : '';
      const rawPdamBill = parts[5] ? parts[5].trim() : '';
      const rawTrashBill = parts[6] ? parts[6].trim() : '';
      const rawTotalBill = parts[7] ? parts[7].trim() : '';

      const cleanUnit = rawUnit.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const resident = residentMap[cleanUnit];

      if (!resident) {
        console.warn(`[PERINGATAN] Warga tidak ditemukan untuk unit ${rawUnit} (${rawName})`);
        continue;
      }

      const residentKtp = resident.ktp;
      const meterApril = rawMeterApril !== '' ? Number(rawMeterApril) : null;
      const meterMei = rawMeterMei !== '' ? Number(rawMeterMei) : null;

      // Update resident initialMeter (April start / April current fallback)
      if (meterApril !== null) {
        const { error: resUpdErr } = await supabase
          .from('residents')
          .update({ initialmeter: meterApril }) // Lowercase in DB!
          .eq('ktp', residentKtp);
        
        if (resUpdErr) {
          console.error(`Gagal update initialmeter warga ${rawUnit}:`, resUpdErr);
        } else {
          updateCountResidents++;
        }
      }

      // Upsert April 2026 Billing Record (using Meter April as April's currentMeter)
      if (meterApril !== null) {
        const { data: existingApr } = await supabase
          .from('billing')
          .select('*')
          .eq('residentktp', residentKtp)
          .eq('month', 'April')
          .eq('year', 2026);

        const prevMeterApr = existingApr && existingApr.length > 0 ? Number(existingApr[0].prevmeter || existingApr[0].prevMeter || 100) : 100;
        const usageApr = Math.max(0, meterApril - prevMeterApr);
        const pdamBillApr = usageApr > 0 ? usageApr * 2500 : 25000;
        const trashBillCost = 10000;
        const totalBillApr = pdamBillApr + trashBillCost;

        const aprBillRecord = {
          id: `bill-${residentKtp}-april`,
          residentktp: residentKtp, // Lowercase in DB!
          month: 'April',
          year: 2026,
          prevmeter: prevMeterApr, // Lowercase in DB!
          currentmeter: meterApril, // Lowercase in DB!
          usage: usageApr,
          pdambill: pdamBillApr, // Lowercase in DB!
          trashbill: trashBillCost, // Lowercase in DB!
          totalbill: totalBillApr, // Lowercase in DB!
          status: 'Lunas' // April is history
        };

        const { error: aprErr } = await supabase.from('billing').upsert([aprBillRecord]);
        if (aprErr) {
          console.error(`Gagal menyimpan tagihan April untuk ${rawUnit}:`, aprErr);
        } else {
          updateCountBilling++;
        }
      }

      // Upsert May 2026 Billing Record
      if (meterApril !== null && meterMei !== null) {
        const usageMei = Number(rawUsage) || Math.max(0, meterMei - meterApril);
        const pdamBillMei = Number(rawPdamBill) || (usageMei > 0 ? usageMei * 2500 : 25000);
        const trashBillMei = Number(rawTrashBill) || 10000;
        const totalBillMei = Number(rawTotalBill) || (pdamBillMei + trashBillMei);

        const meiBillRecord = {
          id: `bill-${residentKtp}-mei`,
          residentktp: residentKtp, // Lowercase in DB!
          month: 'Mei',
          year: 2026,
          prevmeter: meterApril, // Lowercase in DB!
          currentmeter: meterMei, // Lowercase in DB!
          usage: usageMei,
          pdambill: pdamBillMei, // Lowercase in DB!
          trashbill: trashBillMei, // Lowercase in DB!
          totalbill: totalBillMei, // Lowercase in DB!
          status: 'Belum Lunas'
        };

        const { error: meiErr } = await supabase.from('billing').upsert([meiBillRecord]);
        if (meiErr) {
          console.error(`Gagal menyimpan tagihan Mei untuk ${rawUnit}:`, meiErr);
        } else {
          updateCountBilling++;
        }
      }
    }
  }

  console.log(`\nImport selesai!`);
  console.log(`- Berhasil memperbarui initialMeter warga: ${updateCountResidents}`);
  console.log(`- Berhasil menginput/mengoreksi tagihan (April & Mei): ${updateCountBilling}`);
}

main();
