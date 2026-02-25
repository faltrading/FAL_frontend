/*
  # Gallery files table
  
  Stores metadata for files uploaded to the gallery storage bucket.
  Column names match the frontend GalleryFile type exactly:
    file_name, file_path, file_type, file_size, category, uploaded_by
  
  RLS:
  - All authenticated users can SELECT
  - Only admin can INSERT and DELETE
*/

CREATE TABLE IF NOT EXISTS gallery_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Other',
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_files ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view gallery files
CREATE POLICY "Authenticated users can view gallery files"
  ON gallery_files FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only admin can insert gallery files
CREATE POLICY "Admin can insert gallery files"
  ON gallery_files FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admin can delete gallery files
CREATE POLICY "Admin can delete gallery files"
  ON gallery_files FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_gallery_files_category ON gallery_files(category);
CREATE INDEX IF NOT EXISTS idx_gallery_files_created_at ON gallery_files(created_at DESC);
