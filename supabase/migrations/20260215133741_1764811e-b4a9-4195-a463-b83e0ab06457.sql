
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('restaurant', 'ngo', 'volunteer');

-- User roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS for user_roles
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  organization_name TEXT DEFAULT '',
  simulated_location TEXT DEFAULT 'Downtown',
  simulated_lat DOUBLE PRECISION DEFAULT 40.7128,
  simulated_lng DOUBLE PRECISION DEFAULT -74.0060,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Food items table
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantity_unit TEXT NOT NULL DEFAULT 'kg',
  expiry_time TIMESTAMPTZ NOT NULL,
  demand_level TEXT NOT NULL DEFAULT 'medium',
  waste_probability TEXT DEFAULT 'low',
  suggested_action TEXT DEFAULT 'sell',
  ai_suggestion TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Restaurants can manage own food" ON public.food_items FOR ALL TO authenticated USING (restaurant_id = auth.uid()) WITH CHECK (restaurant_id = auth.uid());
CREATE POLICY "All authenticated can read food items" ON public.food_items FOR SELECT TO authenticated USING (true);

-- Donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES auth.users(id) NOT NULL,
  ngo_id UUID REFERENCES auth.users(id),
  volunteer_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'available',
  pickup_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read donations" ON public.donations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restaurants can create donations" ON public.donations FOR INSERT TO authenticated WITH CHECK (restaurant_id = auth.uid());
CREATE POLICY "Restaurants can update own donations" ON public.donations FOR UPDATE TO authenticated USING (restaurant_id = auth.uid());
CREATE POLICY "NGOs can update donations" ON public.donations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ngo'));

-- Delivery missions table
CREATE TABLE public.delivery_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE NOT NULL,
  volunteer_id UUID REFERENCES auth.users(id),
  restaurant_location TEXT NOT NULL DEFAULT '',
  ngo_location TEXT NOT NULL DEFAULT '',
  food_details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.delivery_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read missions" ON public.delivery_missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create missions" ON public.delivery_missions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Volunteers can update missions" ON public.delivery_missions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'volunteer'));

-- Impact stats (aggregated view, one row updated)
CREATE TABLE public.impact_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_meals_saved INTEGER NOT NULL DEFAULT 0,
  total_food_rescued_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  estimated_co2_reduced_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.impact_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read impact" ON public.impact_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can update impact" ON public.impact_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial impact stats row
INSERT INTO public.impact_stats (total_meals_saved, total_food_rescued_kg, estimated_co2_reduced_kg) VALUES (0, 0, 0);
