import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a null client if credentials are not available (for build time)
let supabase: SupabaseClient;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  // Create a dummy client for build time - will be replaced at runtime
  console.warn('Supabase credentials not found. Using placeholder client.');
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };
