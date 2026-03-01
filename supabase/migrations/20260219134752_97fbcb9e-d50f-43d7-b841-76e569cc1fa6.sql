
-- Fix delivery_missions policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "All authenticated can read missions" ON public.delivery_missions;
CREATE POLICY "All authenticated can read missions"
  ON public.delivery_missions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can create missions" ON public.delivery_missions;
CREATE POLICY "Authenticated can create missions"
  ON public.delivery_missions FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Volunteers can update missions" ON public.delivery_missions;
CREATE POLICY "Volunteers can update missions"
  ON public.delivery_missions FOR UPDATE TO authenticated
  USING (true);

-- Fix donations policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "All authenticated can read donations" ON public.donations;
CREATE POLICY "All authenticated can read donations"
  ON public.donations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Restaurants can create donations" ON public.donations;
CREATE POLICY "Restaurants can create donations"
  ON public.donations FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = auth.uid());

DROP POLICY IF EXISTS "NGOs can update donations" ON public.donations;
CREATE POLICY "NGOs can update donations"
  ON public.donations FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Restaurants can update own donations" ON public.donations;
CREATE POLICY "Restaurants can update own donations"
  ON public.donations FOR UPDATE TO authenticated
  USING (restaurant_id = auth.uid());

-- Fix food_items policies
DROP POLICY IF EXISTS "All authenticated can read food items" ON public.food_items;
CREATE POLICY "All authenticated can read food items"
  ON public.food_items FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Restaurants can manage own food" ON public.food_items;
CREATE POLICY "Restaurants can manage own food"
  ON public.food_items FOR ALL TO authenticated
  USING (restaurant_id = auth.uid())
  WITH CHECK (restaurant_id = auth.uid());

-- Fix user_roles policy
DROP POLICY IF EXISTS "All authenticated can read roles" ON public.user_roles;
CREATE POLICY "All authenticated can read roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Users can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Fix impact_stats policies
DROP POLICY IF EXISTS "All authenticated can read impact" ON public.impact_stats;
CREATE POLICY "All authenticated can read impact"
  ON public.impact_stats FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "All authenticated can update impact" ON public.impact_stats;
CREATE POLICY "All authenticated can update impact"
  ON public.impact_stats FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
