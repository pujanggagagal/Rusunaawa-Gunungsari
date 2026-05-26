import { supabase } from './supabaseClient';

async function testConnection() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('residents').select('*').limit(1);
  if (error) {
    console.error('Error fetching residents:', error.message);
  } else {
    console.log('Residents fetched:', data);
  }
}

testConnection();
