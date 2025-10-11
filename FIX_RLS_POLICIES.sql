-- Fix RLS Policies for PC Setups
-- Run this in your Supabase SQL Editor if you're getting 403 Forbidden errors

-- First, make sure the tables exist and have RLS enabled
ALTER TABLE pc_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_parts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own setups" ON pc_setups;
DROP POLICY IF EXISTS "Users can insert own setups" ON pc_setups;
DROP POLICY IF EXISTS "Users can update own setups" ON pc_setups;
DROP POLICY IF EXISTS "Users can delete own setups" ON pc_setups;

DROP POLICY IF EXISTS "Users can view parts of own setups" ON setup_parts;
DROP POLICY IF EXISTS "Users can insert parts to own setups" ON setup_parts;
DROP POLICY IF EXISTS "Users can update parts of own setups" ON setup_parts;
DROP POLICY IF EXISTS "Users can delete parts of own setups" ON setup_parts;

-- Create RLS policies for pc_setups
CREATE POLICY "Users can view own setups" ON pc_setups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own setups" ON pc_setups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own setups" ON pc_setups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own setups" ON pc_setups
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for setup_parts
CREATE POLICY "Users can view parts of own setups" ON setup_parts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pc_setups 
      WHERE pc_setups.id = setup_parts.setup_id 
      AND pc_setups.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parts to own setups" ON setup_parts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pc_setups 
      WHERE pc_setups.id = setup_parts.setup_id 
      AND pc_setups.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parts of own setups" ON setup_parts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pc_setups 
      WHERE pc_setups.id = setup_parts.setup_id 
      AND pc_setups.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parts of own setups" ON setup_parts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pc_setups 
      WHERE pc_setups.id = setup_parts.setup_id 
      AND pc_setups.user_id = auth.uid()
    )
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('pc_setups', 'setup_parts')
ORDER BY tablename, policyname;
