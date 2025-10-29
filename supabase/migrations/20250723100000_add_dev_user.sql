/*
  # [Data Update] Configure DEV User Profile
  [This script configures the user with email 'robrito10@gmail.com' to have the 'dev' profile. It will create the profile if it doesn't exist, or update it if it does. This ensures the DEV user is correctly set up in the database.]

  ## Query Description: [This operation inserts or updates a single row in the 'public.profiles' table. It finds the user's ID from the 'auth.users' table using their email.
  **Prerequisite:** You must first create a user with the email 'robrito10@gmail.com' in the Supabase Authentication dashboard. This script will fail if that user does not exist. This operation is safe and will not cause data loss.]

  ## Metadata:
  - Schema-Category: ["Data"]
  - Impact-Level: ["Low"]
  - Requires-Backup: false
  - Reversible: false

  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: No
  - Auth Requirements: [Requires a user with email 'robrito10@gmail.com' to exist.]
*/
INSERT INTO public.profiles (id, nome, email, perfil)
SELECT
    id,
    'DEV' AS nome,
    'robrito10@gmail.com' AS email,
    'dev' AS perfil
FROM auth.users
WHERE email = 'robrito10@gmail.com'
ON CONFLICT (id)
DO UPDATE SET
    perfil = EXCLUDED.perfil,
    nome = EXCLUDED.nome;
