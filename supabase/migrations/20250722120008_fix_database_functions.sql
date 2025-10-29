/*
# [Fix and Secure Database Functions]
This migration corrects a function definition conflict and improves database security.

## Query Description:
This operation will:
1.  **Fix Function Conflict:** The previous migration failed because it tried to change the return type of the `get_my_profile()` function without dropping it first. This script explicitly drops the existing `get_my_profile()` and `get_my_admin_id()` functions.
2.  **Recreate Functions Securely:** It then recreates both functions with the correct definitions and, importantly, sets a fixed `search_path`. This resolves the "Function Search Path Mutable" security warning by preventing potential hijacking of the functions.

This is a corrective and preventative maintenance step to ensure database stability and security.

## Metadata:
- Schema-Category: ["Security", "Fix"]
- Impact-Level: ["Medium"]
- Requires-Backup: false
- Reversible: false

## Structure Details:
- **Functions Dropped:** `get_my_profile`, `get_my_admin_id`
- **Functions Created:** `get_my_profile`, `get_my_admin_id` (with security enhancements)

## Security Implications:
- RLS Status: No changes to RLS policies themselves.
- Policy Changes: No.
- Auth Requirements: Functions rely on `auth.uid()`.
- **Fixes:** Addresses the migration error "cannot change return type" and the "Function Search Path Mutable" security warning.

## Performance Impact:
- Indexes: None.
- Triggers: None.
- Estimated Impact: Low.
*/

-- Drop the existing functions to resolve the conflict
DROP FUNCTION IF EXISTS public.get_my_profile();
DROP FUNCTION IF EXISTS public.get_my_admin_id();

-- Recreate functions with the correct return type and security settings
CREATE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select * from public.profiles where id = auth.uid();
$$;

CREATE FUNCTION public.get_my_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select admin_vinculado from public.profiles where id = auth.uid();
$$;
