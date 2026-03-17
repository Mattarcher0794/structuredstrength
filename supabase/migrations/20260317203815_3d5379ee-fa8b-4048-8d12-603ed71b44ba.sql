
-- Create progress_photos table
CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  angle text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can select own progress photos"
ON public.progress_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress photos"
ON public.progress_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress photos"
ON public.progress_photos FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own progress photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own photos
CREATE POLICY "Users can read own progress photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own photos
CREATE POLICY "Users can delete own progress photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
