import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejapskoqfxjiwqcfehxy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqYXBza29xZnhqaXdxY2ZlaHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODczMzgsImV4cCI6MjA5NTM2MzMzOH0.LZ8ItTl5EQnB2MlFL6e3Pg6rshS3LnC-1laYARJ88UI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Kredensial Supabase tidak ditemukan di environment variables!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
