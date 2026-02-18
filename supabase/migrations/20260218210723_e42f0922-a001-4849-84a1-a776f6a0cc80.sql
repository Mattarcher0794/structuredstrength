
ALTER TABLE public.session_exercise_swaps ADD CONSTRAINT session_exercise_swaps_unique UNIQUE (workout_session_id, original_exercise_id);
