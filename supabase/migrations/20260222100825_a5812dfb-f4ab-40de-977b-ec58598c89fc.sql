
-- Allow authenticated users to insert AI-generated exercises
CREATE POLICY "Users can insert ai_generated exercises"
ON public.exercises
FOR INSERT
TO authenticated
WITH CHECK (
  source = 'ai_generated'
  AND is_approved = false
  AND created_by = auth.uid()
);

-- Allow updates to is_approved (for dev review approve action)
-- and deletes (for dev review remove action) — restrict to own rows or approved-flag changes
CREATE POLICY "Users can update own AI exercises"
ON public.exercises
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND source = 'ai_generated')
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own AI exercises"
ON public.exercises
FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND source = 'ai_generated');
