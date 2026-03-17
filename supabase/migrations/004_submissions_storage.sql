-- Create the 'submissions' storage bucket for photo submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  true,
  20971520,  -- 20 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload their own photos
CREATE POLICY "Authenticated users can upload submissions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'submissions');

-- Anyone can view submission photos (public bucket)
CREATE POLICY "Public can view submission photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'submissions');

-- Users can update their own uploads, admins can update any
CREATE POLICY "Users can update own submission photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'submissions')
  WITH CHECK (bucket_id = 'submissions');

-- Admins can delete submission photos
CREATE POLICY "Admins can delete submission photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
