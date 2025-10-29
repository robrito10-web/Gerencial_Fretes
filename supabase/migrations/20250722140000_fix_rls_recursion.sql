/*
# [Security] Fix RLS Infinite Recursion on Profiles

This migration script resolves a critical "infinite recursion" error caused by misconfigured Row Level Security (RLS) policies on the `public.profiles` table. It replaces the old, faulty policies with a new, safe, and non-recursive set.

## Query Description:
This operation will **DROP ALL EXISTING POLICIES** on the `public.profiles` table before creating new ones. This step is essential to remove the source of the error. While no data is lost, access control rules will be entirely replaced by the definitions in this script.

- **Helper Functions:** Two helper functions (`get_current_user_role` and `get_current_user_admin_id`) are created. They safely retrieve user metadata from `auth.users` to avoid querying `public.profiles` within its own policies, which was the root cause of the recursion.
- **New Policies:** A comprehensive set of policies is created to grant appropriate permissions to `dev`, `admin`, and `motorista` roles based on the application's logic.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: false (the original policies are permanently dropped)

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes. All policies on `public.profiles` are reset.
- Auth Requirements: Access is determined by the authenticated user's ID (`auth.uid()`) and their role (`perfil`) stored in their authentication metadata.
*/

-- Step 1: Create helper functions to safely get user metadata from `auth.users`.
-- This avoids the recursive loop of a policy on `profiles` querying `profiles`.

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT raw_user_meta_data ->> 'perfil'
  FROM auth.users
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_current_user_admin_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (raw_user_meta_data ->> 'admin_vinculado')::uuid
  FROM auth.users
  WHERE id = auth.uid()
$$;

-- Step 2: Enable RLS on the table if it's not already.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies on the profiles table. This is crucial to remove the faulty one.
-- A loop is used to drop all policies to ensure a clean slate, regardless of their names.
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles;';
    END LOOP;
END;
$$;


-- Step 4: Create the new, non-recursive policies.
-- These policies are combined with OR.

-- POLICY 1: DEV users have unrestricted access to all profiles.
CREATE POLICY "DEV users have full access"
ON public.profiles FOR ALL
USING (get_current_user_role() = 'dev')
WITH CHECK (get_current_user_role() = 'dev');

-- POLICY 2: Users can view and modify their own profile.
CREATE POLICY "Users can manage their own profile"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- POLICY 3: Admins can view the profiles of drivers linked to them.
CREATE POLICY "Admins can view their linked drivers"
ON public.profiles FOR SELECT
USING (
    (get_current_user_role() = 'admin') AND (admin_vinculado = auth.uid())
);

-- POLICY 4: Drivers can view the profile of their linked admin.
CREATE POLICY "Drivers can view their admin"
ON public.profiles FOR SELECT
USING (
    (get_current_user_role() = 'motorista') AND (id = get_current_user_admin_id())
);
