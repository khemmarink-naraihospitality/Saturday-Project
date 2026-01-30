
import { createClient } from '@supabase/supabase-js'

// Hardcoded for Production Fix
const supabaseUrl = "https://cwogmwyqoavzrbwwgved.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3b2dtd3lxb2F2enJid3dndmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NjU3NjYsImV4cCI6MjA4NTM0MTc2Nn0.Exds1Dn1abpdV_jHn7-Vf-B7blGHl2bZLBf7gelMKAc"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
