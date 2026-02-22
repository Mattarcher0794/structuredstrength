
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read exercises" ON public.exercises;

-- New SELECT policy: approved exercises + user's own AI-generated ones
CREATE POLICY "Users can read approved or own AI exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (
  is_approved = true
  OR (source = 'ai_generated' AND created_by = auth.uid())
);
