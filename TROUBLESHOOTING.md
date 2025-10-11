# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot coerce the result to a single JSON object" Error

**Problem**: This error occurs when trying to fetch user currency but the user profile doesn't exist yet.

**Solution**: The code has been updated to automatically create a user profile when needed. If you still see this error, try logging out and logging back in.

### 2. "new row violates row-level security policy" Error (403 Forbidden)

**Problem**: The Row Level Security (RLS) policies for the new tables haven't been set up in your Supabase database.

**Solution**: 
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `FIX_RLS_POLICIES.sql`
4. This will create all the necessary RLS policies

### 3. Tables Don't Exist

**Problem**: The `pc_setups` and `setup_parts` tables haven't been created yet.

**Solution**:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the complete SQL script from `DATABASE_SETUP.sql`
4. This will create all tables, policies, and indexes

### 4. Setup Creation Fails

**Problem**: You can't save setups even after fixing the above issues.

**Solution**:
1. Make sure you have at least one part in your current build
2. Check that you're logged in properly
3. Try refreshing the page and logging in again
4. Check the browser console for any error messages

### 5. Setups Don't Load

**Problem**: Saved setups don't appear in the Setups page.

**Solution**:
1. Check that the RLS policies are correctly set up
2. Verify you're logged in with the same account that created the setups
3. Check the browser console for any error messages

## Verification Steps

To verify everything is working correctly:

1. **Check Tables Exist**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('pc_setups', 'setup_parts');
   ```

2. **Check RLS Policies**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename IN ('pc_setups', 'setup_parts')
   ORDER BY tablename, policyname;
   ```

3. **Test Setup Creation**:
   - Add some parts in the Parts Builder
   - Go to Setups page
   - Try to save a setup
   - Check if it appears in the list

## Getting Help

If you're still experiencing issues:

1. Check the browser console for error messages
2. Check the Supabase logs in your dashboard
3. Verify your Supabase credentials in `src/lib/supabase.ts`
4. Make sure you're using the latest version of the code
