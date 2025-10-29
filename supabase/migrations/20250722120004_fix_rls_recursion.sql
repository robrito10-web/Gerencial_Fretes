/*
          # [Fix RLS Infinite Recursion]
          This migration replaces the existing Row Level Security (RLS) policies on the 'profiles' table to resolve an "infinite recursion" error. The error occurs when a policy function indirectly calls itself by querying the same table it is protecting.

          ## Query Description: This operation will:
          1. Drop all existing RLS policies on the `public.profiles` table to remove the faulty logic.
          2. Create a `SECURITY DEFINER` helper function `get_user_role(user_id uuid)` which can safely retrieve a user's role without triggering RLS, thus breaking the recursion loop.
          3. Re-create the policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` using this safe helper function, ensuring the application's access control logic works as intended.
          This change is safe and necessary for the application to function correctly.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: true

          ## Structure Details:
          - Tables affected: `public.profiles` (RLS Policies)
          - Functions created: `public.get_user_role(uuid)`

          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes. All policies on `public.profiles` are replaced.
          - Auth Requirements: Policies rely on `auth.uid()` and the new helper function.

          ## Performance Impact:
          - Indexes: None
          - Triggers: None
          - Estimated Impact: Negligible. The helper function is a simple lookup.
          */

-- Step 1: Drop all existing policies on the profiles table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to read their drivers" ON public.profiles;
DROP POLICY IF EXISTS "Allow dev to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access based on role" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on role" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for dev users" ON public.profiles;

-- Step 2: Create a SECURITY DEFINER function to safely get a user's role without causing recursion.
-- This function is owned by the 'postgres' superuser and bypasses RLS when executed.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking.
SET search_path = public
AS $$
DECLARE
  role text;
BEGIN
  SELECT p.perfil INTO role
  FROM public.profiles p
  WHERE p.id = user_id;
  RETURN role;
END;
$$;

-- Step 3: Re-create the RLS policies using the safe helper function.

-- SELECT Policy:
-- 1. Users can see their own profile.
-- 2. 'dev' users can see all profiles.
-- 3. 'admin' users can see the profiles of drivers linked to them.
CREATE POLICY "Enable read access based on role" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR
  public.get_user_role(auth.uid()) = 'dev' OR
  (public.get_user_role(auth.uid()) = 'admin' AND admin_vinculado = auth.uid())
);

-- UPDATE Policy:
-- 1. Users can update their own profile.
-- 2. 'dev' users can update any profile.
CREATE POLICY "Enable update for users based on role" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id OR
  public.get_user_role(auth.uid()) = 'dev'
) WITH CHECK (
  auth.uid() = id OR
  public.get_user_role(auth.uid()) = 'dev'
);

-- INSERT Policy:
-- Any authenticated user can insert a profile. The profile ID must match their own auth ID.
CREATE POLICY "Enable insert for authenticated users" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- DELETE Policy:
-- Only 'dev' users can delete profiles.
CREATE POLICY "Enable delete for dev users" ON public.profiles
FOR DELETE USING (
  public.get_user_role(auth.uid()) = 'dev'
);
