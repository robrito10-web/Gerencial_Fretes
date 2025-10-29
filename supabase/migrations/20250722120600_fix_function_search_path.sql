/*
# [SECURITY] Fix Function Search Path
This migration secures existing database functions by explicitly setting their `search_path`. This is a critical security measure to prevent potential hijacking attacks, as recommended by Supabase security advisories.

## Query Description:
- This operation alters two existing functions: `get_my_profile()` and `get_my_admin_id()`.
- It sets `search_path = public` for both, ensuring they only look for tables and other objects within the `public` schema.
- This change does not affect data and is safe to apply.

## Metadata:
- Schema-Category: ["Security", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Functions affected: `get_my_profile`, `get_my_admin_id`

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: None
- Mitigates: Function search path hijacking vulnerability.
*/

ALTER FUNCTION public.get_my_profile()
SET search_path = public;

ALTER FUNCTION public.get_my_admin_id()
SET search_path = public;
