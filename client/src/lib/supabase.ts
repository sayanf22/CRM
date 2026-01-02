import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://odmynwnyerkggobsprut.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbXlud255ZXJrZ2dvYnNwcnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTI0MTksImV4cCI6MjA4Mjc2ODQxOX0.0x1SgZWmOQtLr2CIOxF-0bjFXVJG_epSMhBQjPUgiVw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
