import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

const correctCoords = [
  { id: 'coord-1', name: 'Desi', ktp: '111111', assignedfloor: 1, assignedblock: 'Lantai 1' },
  { id: 'coord-2', name: 'Sohib', ktp: '222222', assignedfloor: 2, assignedblock: 'Lantai 2' },
  { id: 'coord-3', name: 'Mashur', ktp: '333333', assignedfloor: 3, assignedblock: 'Lantai 3' },
  { id: 'coord-4', name: 'Mahsum', ktp: '444444', assignedfloor: 4, assignedblock: 'Lantai 4' },
  { id: 'coord-5', name: 'Hanafi', ktp: '555555', assignedfloor: 5, assignedblock: 'Lantai 5' }
];

async function run() {
  const { error } = await supabase.from('coordinators').upsert(correctCoords);
  if (error) console.error(error);
  else console.log('Fixed coords!');
}
run();
