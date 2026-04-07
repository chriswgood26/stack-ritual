import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client — for reading supplements (no auth needed)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service client — for server-side writes with Clerk user IDs
// Lazy-initialized to avoid crashing during build when env var is missing
export const supabaseAdmin = (() => {
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  // Return a dummy during build that throws on actual use
  return createClient(supabaseUrl, supabaseAnonKey);
})();
