CREATE UNIQUE INDEX IF NOT EXISTS phase_day_overrides_unique_original
ON public.phase_day_overrides (phase_id, user_id, week_start_date, original_day_of_week);