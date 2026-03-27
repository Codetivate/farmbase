/*
  # Fix User Profile Creation on Signup

  1. Changes
    - Drop the incorrect anon insert policy that doesn't work for trigger context
    - The handle_new_user() function is SECURITY DEFINER which bypasses RLS entirely
    - Verify the trigger function works correctly by ensuring SECURITY DEFINER is set

  2. Important Notes
    - SECURITY DEFINER functions bypass RLS, so no special insert policy is needed for the trigger
    - The existing anon policy was incorrectly permissive and unnecessary
    - We recreate the function to ensure SECURITY DEFINER is properly set
*/

-- Drop the overly permissive anon insert policy (not needed for SECURITY DEFINER trigger)
DROP POLICY IF EXISTS "Service can insert profiles on signup" ON user_profiles;

-- Recreate the trigger function with explicit SECURITY DEFINER and SET search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  assigned_role text;
BEGIN
  SELECT count(*) INTO user_count FROM public.user_profiles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    assigned_role
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
