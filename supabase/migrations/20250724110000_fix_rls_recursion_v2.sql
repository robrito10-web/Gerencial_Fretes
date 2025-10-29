/*
# [Fix] RLS Infinite Recursion v2
This migration fixes an infinite recursion error in the Row Level Security (RLS) policies for the `profiles` table.

## Query Description:
This script replaces the existing RLS policies on the `profiles` table with a new, non-recursive set of policies. It introduces a helper function `get_my_profile_role()` that safely retrieves the current user's role from their authentication token (JWT), avoiding direct lookups on the `profiles` table within the policy itself, which was the cause of the infinite loop.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: false (but can be replaced with new policies)

## Structure Details:
- **Functions Created:** `public.get_my_profile_role()`
- **Policies Dropped:** All existing policies on `public.profiles`.
- **Policies Created:** New SELECT, UPDATE, DELETE, and INSERT policies for `public.profiles`.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes. This corrects a faulty RLS implementation that was preventing all access to the `profiles` table. The new policies correctly enforce the intended access rules.
- Auth Requirements: Users must be authenticated.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. The new function is lightweight.
*/

-- Step 1: Create a helper function to safely get the user's role from the JWT claims.
-- This avoids a recursive lookup on the `profiles` table.
CREATE OR REPLACE FUNCTION public.get_my_profile_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Check for the existence of the 'perfil' key in user_metadata before accessing it.
  IF jsonb_path_exists(current_setting('request.jwt.claims', true)::jsonb, '$.user_metadata.perfil') THEN
    RETURN current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'perfil';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users so policies can use it.
GRANT EXECUTE ON FUNCTION public.get_my_profile_role() TO authenticated;


-- Step 2: Drop all existing policies on the profiles table to ensure a clean slate.
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles;';
    END LOOP;
END;
$$;


-- Step 3: Recreate the policies using the safe helper function.

-- SELECT Policy:
-- Users can see their own profile.
-- Admins can see their own profile AND the profiles of their linked drivers.
-- Devs can see all profiles.
CREATE POLICY "Enable read access based on role"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) -- Any user can see their own profile
  OR
  (public.get_my_profile_role() = 'dev') -- Devs can see all profiles
  OR
  (
    public.get_my_profile_role() = 'admin' AND admin_vinculado = auth.uid() -- Admins can see their linked drivers
  )
);

-- UPDATE Policy:
-- Users can update their own profile.
-- Admins can update their own profile and their linked drivers' profiles.
-- Devs can update all profiles.
CREATE POLICY "Enable update access based on role"
ON public.profiles
FOR UPDATE
USING (
  (auth.uid() = id) -- Any user can update their own profile
  OR
  (public.get_my_profile_role() = 'dev') -- Devs can update all profiles
  OR
  (
    public.get_my_profile_role() = 'admin' AND admin_vinculado = auth.uid() -- Admins can update their linked drivers
  )
)
WITH CHECK (
  (auth.uid() = id)
  OR
  (public.get_my_profile_role() = 'dev')
  OR
  (
    public.get_my_profile_role() = 'admin' AND admin_vinculado = auth.uid()
  )
);

-- DELETE Policy:
-- For safety, only allow DEV users to delete profiles.
CREATE POLICY "Enable delete for dev role only"
ON public.profiles
FOR DELETE
USING (
  public.get_my_profile_role() = 'dev'
);

-- INSERT Policy:
-- Profile creation is handled by a trigger on `auth.users`.
-- This policy allows the service_role (used internally by Supabase for invites/triggers) to insert profiles.
-- Regular authenticated users are blocked from inserting directly.
CREATE POLICY "Enable insert for service_role only"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
);
