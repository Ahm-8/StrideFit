import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ebqavxyykcwzfggrtfhd.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicWF2eHl5a2N3emZnZ3J0ZmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjQ3NTYsImV4cCI6MjA1NzIwMDc1Nn0.GVBC0f9v_ZGFr4UjKSKJj_oG2SUhqflZf0knL1L6Nys'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
