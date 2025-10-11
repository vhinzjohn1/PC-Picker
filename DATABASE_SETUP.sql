-- PC Picker Database Setup Script
-- Run this in your Supabase SQL Editor to create the required tables for PC setups

-- Create pc_setups table
CREATE TABLE IF NOT EXISTS pc_setups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setup_parts table
CREATE TABLE IF NOT EXISTS setup_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id UUID REFERENCES pc_setups(id) ON DELETE CASCADE NOT NULL,
  component TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for better data protection
ALTER TABLE pc_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_parts ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pc_setups_user_id ON pc_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_pc_setups_created_at ON pc_setups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setup_parts_setup_id ON setup_parts(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_parts_component ON setup_parts(component);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on pc_setups
CREATE TRIGGER update_pc_setups_updated_at 
    BEFORE UPDATE ON pc_setups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for setups with part counts
CREATE OR REPLACE VIEW setups_with_stats AS
SELECT 
    s.*,
    COUNT(sp.id) as part_count,
    COALESCE(AVG(sp.amount), 0) as avg_part_price
FROM pc_setups s
LEFT JOIN setup_parts sp ON s.id = sp.setup_id
GROUP BY s.id, s.user_id, s.name, s.description, s.total_amount, s.created_at, s.updated_at;

-- Grant access to the view
GRANT SELECT ON setups_with_stats TO authenticated;
