/*
  # Storage policies for the "gallery" bucket
  
  NOTE: The bucket itself must be created separately (see setup-buckets.mjs).
  These policies control access to objects inside it.
  
  - SELECT (public): anyone can view files (needed for getPublicUrl)
  - INSERT (authenticated + admin only): restricted to admin role
  - DELETE (authenticated + admin only): restricted to admin role
  
  Aligned with gallery_files table policies for consistency.
*/

-- Anyone can view gallery files (public URLs)
CREATE POLICY "Anyone can view gallery files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'gallery');

-- Only admin can upload files to gallery
CREATE POLICY "Admin can insert gallery storage objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gallery'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admin can delete files from gallery
CREATE POLICY "Admin can delete gallery storage objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gallery'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );
