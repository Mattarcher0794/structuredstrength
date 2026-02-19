-- Drop the old check constraint
ALTER TABLE public.exercises DROP CONSTRAINT exercises_movement_pattern_check;

-- Add updated check constraint with full taxonomy
ALTER TABLE public.exercises ADD CONSTRAINT exercises_movement_pattern_check 
  CHECK (movement_pattern IN ('Push', 'Pull', 'Squat', 'Hinge', 'Lunge', 'Carry', 'Core'));