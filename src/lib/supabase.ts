import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// These are public keys that can be safely exposed in client-side code
const supabaseUrl = 'https://nmhnjowvdgoewpqmiiix.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5taG5qb3d2ZGdvZXdwcW1paWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjU2NzYsImV4cCI6MjA3NTYwMTY3Nn0.ERi4uJQT-f97qfMIFH_kfg4R8pMpQana1ZnH3Y6lfBM'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Part {
  id: string
  user_id: string
  component: string
  name: string
  amount: number
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  username: string
  currency: string
  created_at: string
  updated_at: string
}

export interface PCSetup {
  id: string
  user_id: string
  name: string
  description?: string
  total_amount: number
  created_at: string
  updated_at: string
}

export interface SetupPart {
  id: string
  setup_id: string
  component: string
  name: string
  amount: number
  created_at: string
}
