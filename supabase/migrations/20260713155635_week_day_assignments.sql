-- Week Editor: absolute per-calendar-day workout assignments for a given week.
-- Each row means: "this week, calendar-day `day_of_week` shows the workout from
-- template day `source_day_of_week` (NULL = rest)". This ABSOLUTE model replaces
-- the directional phase_day_overrides rows. Reset a week = delete its rows.
CREATE TABLE public.week_day_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  source_day_of_week smallint CHECK (source_day_of_week BETWEEN 1 AND 7),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phase_id, week_start_date, day_of_week)
);

-- Enable RLS
ALTER TABLE public.week_day_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies (owner-only, per operation)
CREATE POLICY "Users can select own week day assignments"
ON public.week_day_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own week day assignments"
ON public.week_day_assignments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own week day assignments"
ON public.week_day_assignments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own week day assignments"
ON public.week_day_assignments FOR DELETE
USING (auth.uid() = user_id);
