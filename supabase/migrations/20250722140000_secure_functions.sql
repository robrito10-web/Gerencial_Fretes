/*
# [SECURITY] Fix Mutable Search Path
This migration secures existing database functions by setting a fixed `search_path`. This prevents potential hijacking attacks where a malicious user could create objects (like tables or functions) in a public schema that would be executed instead of the intended ones.

## Query Description: This operation modifies the configuration of existing functions to enhance security. It does not alter data or table structures.

## Metadata:
- Schema-Category: ["Safe", "Security"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (by removing the SET clause)

## Security Implications:
- RLS Status: Not changed
- Policy Changes: No
- Auth Requirements: Superuser to alter functions.
- Mitigates: `search_path` hijacking vulnerabilities.
*/

ALTER FUNCTION public.get_my_profile() SET search_path = public;
ALTER FUNCTION public.get_my_admin_id() SET search_path = public;
