import { createClient } from "@supabase/supabase-js";

// Read Supabase environment variables from Vite .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project-id") &&
  !supabaseAnonKey.includes("your-anon-key")
);

if (!isSupabaseConfigured) {
  console.info(
    "%c[PayKudi Database] Supabase credentials not set yet. Running in offline/memory mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to connect live.",
    "color: #10b981; font-weight: bold;"
  );
}

// Create a Supabase client instance (or a lightweight null-safe proxy if credentials missing)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createClient(
      "https://placeholder-paykudi.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
      { auth: { persistSession: false } }
    );
