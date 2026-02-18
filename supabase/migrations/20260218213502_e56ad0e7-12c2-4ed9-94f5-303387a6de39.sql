ALTER TABLE public.workout_sessions
ADD COLUMN scheduled_day_type text NOT NULL DEFAULT 'strength',
ADD COLUMN is_schedule_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.workout_sessions
ADD CONSTRAINT workout_sessions_scheduled_day_type_check
CHECK (scheduled_day_type IN ('strength', 'rest', 'cardio'));