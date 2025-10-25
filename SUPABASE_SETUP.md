# Supabase Setup Guide

This guide will help you set up Supabase for your PC Picker application to enable cross-device data synchronization.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account
2. Click "New Project"
3. Choose your organization and enter project details:
   - Name: `pc-picker` (or any name you prefer)
   - Database Password: Generate a strong password
   - Region: Choose the closest to your users
4. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - Project URL (looks like: `https://your-project-ref.supabase.co`)
   - Anon public key (starts with `eyJ...`)

## Step 3: Update Configuration

1. Open `src/lib/supabase.ts`
2. Replace the placeholder values:

```typescript
const supabaseUrl = 'https://your-project-ref.supabase.co' // Your project URL
const supabaseAnonKey = 'your-anon-key' // Your anon key
```

## Step 4: Create Database Tables

In your Supabase dashboard, go to SQL Editor and run the SQL from the `DATABASE_SETUP.sql` file in your project root. This will create all the required tables including:

- `user_profiles` - User information and preferences
- `parts` - Individual PC components
- `pc_setups` - Saved PC configurations
- `setup_parts` - Parts belonging to each setup

The script includes:

- All necessary tables with proper relationships
- Row Level Security (RLS) policies for data protection
- Indexes for optimal performance
- Automatic timestamp updates

Alternatively, you can run the individual table creation scripts:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT NOT NULL,
  currency TEXT DEFAULT 'PHP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parts table
CREATE TABLE parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  component TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pc_setups table
CREATE TABLE pc_setups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setup_parts table
CREATE TABLE setup_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id UUID REFERENCES pc_setups(id) ON DELETE CASCADE NOT NULL,
  component TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for better data protection
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_parts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for parts
CREATE POLICY "Users can view own parts" ON parts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parts" ON parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parts" ON parts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own parts" ON parts
  FOR DELETE USING (auth.uid() = user_id);
```

## Step 5: Enable Anonymous Authentication

1. In Supabase dashboard, go to Authentication → Settings
2. Scroll down to "Anonymous users"
3. Enable "Enable anonymous sign-ins"

## Step 6: Update Your Database Schema

**IMPORTANT**: You need to update your existing database schema to fix the UUID validation errors. Run this SQL in your Supabase SQL Editor:

```sql
-- First, clear existing data that has invalid UUIDs (optional - only if you want to start fresh)
-- DELETE FROM parts WHERE user_id NOT LIKE '%-%-%-%-%';
-- DELETE FROM user_profiles WHERE id NOT LIKE '%-%-%-%-%';

-- Enable Row Level Security for better data protection
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own parts" ON parts;
DROP POLICY IF EXISTS "Users can insert own parts" ON parts;
DROP POLICY IF EXISTS "Users can update own parts" ON parts;
DROP POLICY IF EXISTS "Users can delete own parts" ON parts;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for parts
CREATE POLICY "Users can view own parts" ON parts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parts" ON parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parts" ON parts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own parts" ON parts
  FOR DELETE USING (auth.uid() = user_id);
```

### Add `sort_order` column to support drag-and-drop part ordering

If you are upgrading, run these SQL migration steps (no data will be lost):

```sql
ALTER TABLE parts ADD COLUMN IF NOT EXISTS sort_order INT;

DO $$
DECLARE
  r RECORD;
  i INT := 0;
BEGIN
  FOR r IN SELECT id FROM parts ORDER BY created_at ASC
  LOOP
    UPDATE parts SET sort_order = i WHERE id = r.id;
    i := i + 1;
  END LOOP;
END $$;
```

**Update permissions:**

```sql
-- Allow updates for own parts, including sort_order
DROP POLICY IF EXISTS "Users can update own parts" ON parts;
CREATE POLICY "Users can update own parts" ON parts
  FOR UPDATE USING (auth.uid() = user_id);
```

**Update `Part` table definition:**

| Column     | Type      | Description                     |
| ---------- | --------- | ------------------------------- |
| id         | UUID      | Primary key                     |
| user_id    | UUID      | Foreign key (auth.users)        |
| component  | TEXT      | Component type                  |
| name       | TEXT      | Part name                       |
| amount     | DECIMAL   | Part price/amount               |
| created_at | TIMESTAMP | Record creation timestamp       |
| updated_at | TIMESTAMP | Last updated timestamp          |
| sort_order | INT       | Order of part for drag-and-drop |

After running the above, your app and the database will fully support saving and restoring part order for each user.

## Step 7: Test Your Setup

1. Run your Vue app: `npm run dev`
2. You should be redirected to the login page
3. Try creating an account or logging in as a guest
4. Add some parts and verify they sync to your Supabase database
5. Check your Supabase dashboard → Table Editor to see the data

## Step 8: Deploy to Netlify

1. Build your app: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Your data will now sync across devices with proper authentication!

## Features

- ✅ Cross-device synchronization
- ✅ User authentication (email/password + anonymous)
- ✅ Secure data isolation per user with Row Level Security
- ✅ Real-time updates
- ✅ Long-term session persistence
- ✅ Free tier supports up to 50,000 monthly active users

## Troubleshooting

- **Connection errors**: Check your Supabase URL and key
- **UUID validation errors**: Make sure you've run the schema update SQL from Step 6
- **Authentication errors**: Ensure anonymous authentication is enabled in Supabase
- **403 Forbidden errors**: Check that RLS policies are correctly set up
- **Data not syncing**: Try logging out and logging back in
- **Still having issues**: Check the browser console for specific error messages

## Security Notes

- The anon key is safe to expose in client-side code
- Row Level Security (RLS) ensures users can only access their own data
- User sessions are managed by Supabase and persist across browser sessions
- Anonymous users get temporary accounts that can be converted to permanent ones
