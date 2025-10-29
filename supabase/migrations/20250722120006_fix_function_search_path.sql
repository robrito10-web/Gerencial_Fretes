/*
# [SECURITY] Fix Function Search Path
This migration updates existing database functions to set a non-mutable search_path. This resolves the "Function Search Path Mutable" security advisory by preventing potential hijacking of function execution through search path manipulation.

## Query Description: [This operation modifies function definitions to enhance security. It is a safe, non-destructive change that does not affect data. By explicitly setting the search_path, we ensure that functions always execute with the expected schema context, mitigating security risks.]

## Metadata:
- Schema-Category: ["Safe", "Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Functions being affected:
  - public.get_my_profile()
  - public.get_my_admin_id()

## Security Implications:
- RLS Status: [No Change]
- Policy Changes: [No]
- Auth Requirements: [None]
- Mitigates: "Function Search Path Mutable" security advisory.

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Negligible performance impact. This is a definitional change.]
*/

-- Update get_my_profile function
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS "public"."profiles"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  select * from public.profiles where id = auth.uid();
$$;

-- Update get_my_admin_id function
CREATE OR REPLACE FUNCTION public.get_my_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE
    WHEN (get_my_profile()).perfil = 'admin' THEN auth.uid()
    WHEN (get_my_profile()).perfil = 'motorista' THEN (get_my_profile()).admin_vinculado
    ELSE NULL
  END;
$$;
