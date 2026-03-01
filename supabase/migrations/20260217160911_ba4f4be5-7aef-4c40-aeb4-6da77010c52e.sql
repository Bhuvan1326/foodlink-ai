
-- Allow all authenticated users to read user_roles (needed for auto-matching NGOs)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "All authenticated can read roles"
  ON public.user_roles
  FOR SELECT
  USING (true);
