/*
  # Gallery folders — infinite nesting support

  Creates a `gallery_folders` table with a self-referencing `parent_id`
  so admins can organise gallery files in a tree of arbitrary depth.

  Also adds `folder_id` to `gallery_files` so every file can optionally
  belong to a folder (NULL = root level).

  RLS mirrors the existing gallery_files policies:
    - All authenticated users can SELECT
    - Only admin can INSERT, UPDATE, DELETE
*/

-- ── gallery_folders table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  parent_id  uuid REFERENCES gallery_folders(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gallery folders"
  ON gallery_folders FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert gallery folders"
  ON gallery_folders FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin can update gallery folders"
  ON gallery_folders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin can delete gallery folders"
  ON gallery_folders FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_gallery_folders_parent ON gallery_folders(parent_id);

-- ── add folder_id to gallery_files ───────────────────────────────────────
ALTER TABLE gallery_files
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES gallery_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_files_folder ON gallery_files(folder_id);
