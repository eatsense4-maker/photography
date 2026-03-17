-- Create the 'partners' storage bucket for partner logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partners',
  'partners',
  true,
  5242880,  -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admins) to upload to the partners bucket
CREATE POLICY "Admins can upload partner logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partners'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow anyone to view partner logos (public bucket)
CREATE POLICY "Public can view partner logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'partners');

-- Allow admins to update partner logos
CREATE POLICY "Admins can update partner logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partners'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to delete partner logos
CREATE POLICY "Admins can delete partner logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partners'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
