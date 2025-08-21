import { createClient } from '@supabase/supabase-js';

const url = "https://yjzxbjwewzyhjquhrfzv.supabase.co";
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqenhiandld3p5aGpxdWhyZnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODUxNDUsImV4cCI6MjA2NzY2MTE0NX0.q78732rZWj61LtlkEBOYj259ML4cHkRTTy60nhlsBH8";

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // simpler for email+password
  },
});