import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Advertencia: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en .env.local",
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
