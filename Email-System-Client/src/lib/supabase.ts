import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate Supabase credentials
const isValidConfig = supabaseUrl && 
  supabaseKey && 
  supabaseUrl.includes('supabase.co') && 
  supabaseKey.length > 20;

let supabase: SupabaseClient;

if (isValidConfig) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  // During build time or when credentials are missing, create a placeholder
  // This will be replaced with real credentials at runtime
  if (typeof window !== 'undefined') {
    console.error('Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }
  // Create client with empty values - will fail gracefully on actual API calls
  supabase = createClient(
    'https://placeholder.supabase.co',
    'placeholder-anon-key-for-build-time-only'
  );
}

export { supabase };
