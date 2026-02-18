
-- ============================================================
-- TABLES FIRST
-- ============================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  default_rest_seconds integer NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Exercises (global library)
CREATE TABLE public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  muscle_group text NOT NULL CHECK (muscle_group IN ('Upper', 'Lower', 'Core')),
  sub_muscle text NOT NULL,
  equipment text NOT NULL,
  movement_pattern text NOT NULL CHECK (movement_pattern IN ('Push', 'Pull', 'Squat', 'Hinge', 'Carry', 'Core', 'Isolation')),
  is_unilateral boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read exercises" ON public.exercises FOR SELECT USING (auth.uid() IS NOT NULL);

-- Phases
CREATE TABLE public.phases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  length_weeks integer NOT NULL DEFAULT 6,
  start_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own phases" ON public.phases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON public.phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase Days
CREATE TABLE public.phase_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id uuid NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  day_type text NOT NULL DEFAULT 'rest' CHECK (day_type IN ('rest', 'cardio', 'strength')),
  workout_name text,
  UNIQUE (phase_id, day_of_week)
);

ALTER TABLE public.phase_days ENABLE ROW LEVEL SECURITY;

-- Phase Day Exercises
CREATE TABLE public.phase_day_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_day_id uuid NOT NULL REFERENCES public.phase_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id),
  order_index integer NOT NULL DEFAULT 0,
  num_sets integer NOT NULL DEFAULT 3,
  min_reps integer NOT NULL DEFAULT 8,
  max_reps integer NOT NULL DEFAULT 12,
  notes text,
  rest_seconds integer
);

ALTER TABLE public.phase_day_exercises ENABLE ROW LEVEL SECURITY;

-- Workout Sessions
CREATE TABLE public.workout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.phases(id) ON DELETE SET NULL,
  phase_day_id uuid REFERENCES public.phase_days(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Session Sets
CREATE TABLE public.session_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id),
  exercise_name_snapshot text NOT NULL,
  set_number integer NOT NULL,
  reps integer,
  weight numeric,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;

-- Session Exercise Swaps
CREATE TABLE public.session_exercise_swaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  original_exercise_id uuid NOT NULL REFERENCES public.exercises(id),
  replacement_exercise_id uuid NOT NULL REFERENCES public.exercises(id)
);

ALTER TABLE public.session_exercise_swaps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (now tables exist)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_phase_owner(_phase_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.phases WHERE id = _phase_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_phase_day_owner(_phase_day_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.phase_days pd JOIN public.phases p ON p.id = pd.phase_id
    WHERE pd.id = _phase_day_id AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_session_owner(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = _session_id AND user_id = auth.uid());
$$;

-- ============================================================
-- RLS POLICIES using helper functions
-- ============================================================

CREATE POLICY "Users manage own phase days" ON public.phase_days FOR ALL
  USING (public.is_phase_owner(phase_id)) WITH CHECK (public.is_phase_owner(phase_id));

CREATE POLICY "Users manage own phase day exercises" ON public.phase_day_exercises FOR ALL
  USING (public.is_phase_day_owner(phase_day_id)) WITH CHECK (public.is_phase_day_owner(phase_day_id));

CREATE POLICY "Users manage own session sets" ON public.session_sets FOR ALL
  USING (public.is_session_owner(workout_session_id)) WITH CHECK (public.is_session_owner(workout_session_id));

CREATE POLICY "Users manage own swaps" ON public.session_exercise_swaps FOR ALL
  USING (public.is_session_owner(workout_session_id)) WITH CHECK (public.is_session_owner(workout_session_id));
