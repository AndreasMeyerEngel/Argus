import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// In local/Docker mode these vars are absent. Provide stub values so the
// module loads without throwing — the supabase client is never actually called
// when IS_LOCAL is true (see storage.ts / AuthContext.tsx).
export const supabase = createClient(
  url || 'http://localhost',
  key || 'local'
)
