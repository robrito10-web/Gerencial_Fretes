/*
# [Fix Missing Function and Create Cadastros Schema]
This script corrects the "function does not exist" error from the previous migration by creating the necessary helper functions. It also creates the tables and policies required for the "Cadastros" (Registrations) feature.

## Query Description:
This is a structural and safe operation. It creates one helper function (`get_my_admin_id`), two new tables (`cars` and `tire_brands`), and applies Row Level Security (RLS) policies to them. This script does not modify or delete any existing user data. Its purpose is to fix the database schema to allow the application to function correctly. This also addresses the "Function Search Path Mutable" security warning by setting a fixed `search_path`.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by dropping the created tables and function)

## Structure Details:
- **Function Created:**
  - `public.get_my_admin_id()`: Securely determines the admin ID associated with the current user (whether they are an admin or a driver).
- **Tables Created:**
  - `public.cars`: Stores vehicle information linked to an admin.
  - `public.tire_brands`: Stores a global list of tire brand names.
- **RLS Policies:**
  - Enables RLS on `cars` and `tire_brands`.
  - Creates policies to ensure admins can only manage their own cars, drivers can view their admin's cars, and that tire brands can be managed appropriately.

## Security Implications:
- RLS Status: Enabled on new tables.
- Policy Changes: Yes, new policies are created for `cars` and `tire_brands`.
- Auth Requirements: Policies rely on the authenticated user's role and ID.
- **Security Advisory Fix:** Sets `search_path` on the created function to address the security warning.

## Performance Impact:
- Indexes: Primary keys and unique constraints are indexed.
- Triggers: None.
- Estimated Impact: Low.
*/

-- STEP 1: Create the missing helper function with a fixed search_path.
-- This function is crucial for RLS policies to determine which admin's data a user can access.

CREATE OR REPLACE FUNCTION public.get_my_admin_id()
RETURNS UUID
LANGUAGE plpgsql STABLE
-- Set a fixed search_path to address the security advisory and ensure stability.
SET search_path = public
AS $$
DECLARE
  user_perfil TEXT;
  user_admin_id UUID;
BEGIN
  -- Fetch the profile type and linked admin for the currently authenticated user.
  SELECT perfil, admin_vinculado
  INTO user_perfil, user_admin_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Return the correct admin ID based on the user's profile.
  IF user_perfil = 'admin' THEN
    RETURN auth.uid(); -- If the user is an admin, their ID is the admin ID.
  ELSIF user_perfil = 'motorista' THEN
    RETURN user_admin_id; -- If a driver, return their linked admin's ID.
  ELSE
    RETURN NULL; -- For other profiles (like 'dev'), return NULL.
  END IF;
END;
$$;


-- STEP 2: Create the 'cars' table for the Cadastros feature.

CREATE TABLE IF NOT EXISTS public.cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    placa TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    ano INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add a unique constraint for placa per admin to avoid duplicates.
ALTER TABLE public.cars
ADD CONSTRAINT unique_placa_per_admin UNIQUE (admin_id, placa);

-- Enable Row Level Security for the cars table.
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

-- Clean up any old policies that might exist.
DROP POLICY IF EXISTS "Admins can manage their own cars" ON public.cars;
DROP POLICY IF EXISTS "Users can view cars of their admin" ON public.cars;

-- Create new, correct policies.
CREATE POLICY "Admins can manage their own cars"
ON public.cars
FOR ALL
USING (auth.uid() = admin_id); -- Admins can do anything with rows where they are the admin.

CREATE POLICY "Users can view cars of their admin"
ON public.cars
FOR SELECT
USING (admin_id = public.get_my_admin_id()); -- Any user (admin or driver) can view cars belonging to their associated admin.


-- STEP 3: Create the 'tire_brands' table for the Cadastros feature.

CREATE TABLE IF NOT EXISTS public.tire_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security for the tire_brands table.
ALTER TABLE public.tire_brands ENABLE ROW LEVEL SECURITY;

-- Clean up any old policies.
DROP POLICY IF EXISTS "Authenticated users can view tire brands" ON public.tire_brands;
DROP POLICY IF EXISTS "Admins can add new tire brands" ON public.tire_brands;

-- Create new policies.
CREATE POLICY "Authenticated users can view tire brands"
ON public.tire_brands
FOR SELECT
USING (auth.role() = 'authenticated'); -- Any logged-in user can see the list of brands.

CREATE POLICY "Admins can add new tire brands"
ON public.tire_brands
FOR INSERT
WITH CHECK (
    (SELECT perfil FROM public.profiles WHERE id = auth.uid()) = 'admin'
); -- Only users with the 'admin' profile can add new brands.
