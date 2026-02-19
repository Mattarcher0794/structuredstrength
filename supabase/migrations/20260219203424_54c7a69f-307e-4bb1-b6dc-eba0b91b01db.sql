-- Create the nutrition_daily table
CREATE TABLE public.nutrition_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  source text NOT NULL DEFAULT 'apple_health',
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.nutrition_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own nutrition"
ON public.nutrition_daily FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition"
ON public.nutrition_daily FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition"
ON public.nutrition_daily FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition"
ON public.nutrition_daily FOR DELETE
USING (auth.uid() = user_id);