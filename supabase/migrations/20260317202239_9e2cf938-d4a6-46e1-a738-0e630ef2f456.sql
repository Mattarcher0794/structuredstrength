
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weight_kg numeric NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own weight logs" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight logs" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight logs" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight logs" ON public.weight_logs FOR DELETE USING (auth.uid() = user_id);
