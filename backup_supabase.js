import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBackup() {
  console.log('Starting Supabase Backup process...');
  
  const tables = ['residents', 'coordinators', 'billing', 'finance_logs'];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'supabase_backups', `backup_${timestamp}`);

  try {
    // Ensure backup directory exists
    fs.mkdirSync(backupDir, { recursive: true });

    for (const table of tables) {
      console.log(`Fetching data from table: ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Error fetching data from ${table}:`, error.message);
        continue;
      }

      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`✓ Backup saved: ${table}.json (${data.length} records)`);
    }

    console.log(`\n🎉 Backup completed successfully!`);
    console.log(`All files are saved in:\n${backupDir}`);
  } catch (err) {
    console.error('An error occurred during the backup process:', err);
  }
}

runBackup();
