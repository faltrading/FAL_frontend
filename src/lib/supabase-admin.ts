import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service_role key.
 * This bypasses RLS and should NEVER be exposed to the browser.
 *
 * Required env vars (NOT prefixed with NEXT_PUBLIC_):
 *   SUPABASE_SERVICE_ROLE_KEY
 */

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing server env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Ensure the "gallery" storage bucket exists.
 * Creates it (public, no size/type limits) if missing.
 * Updates it if it already exists to remove restrictions.
 * Safe to call multiple times.
 */
let _bucketReady = false;

const GALLERY_BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: 5368709120,   // 5 GB — effectively unlimited
  allowedMimeTypes: undefined, // accept any file type
};

export async function ensureGalleryBucket(): Promise<void> {
  if (_bucketReady) return;

  const supabase = getSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === "gallery");

  if (!exists) {
    const { error } = await supabase.storage.createBucket("gallery", GALLERY_BUCKET_OPTIONS);
    if (error) {
      console.error("[supabase-admin] Failed to create gallery bucket:", error.message);
      throw error;
    }
    console.log("[supabase-admin] Created 'gallery' storage bucket");
  } else {
    // Update existing bucket to remove any size / MIME restrictions
    const { error } = await supabase.storage.updateBucket("gallery", GALLERY_BUCKET_OPTIONS);
    if (error) {
      console.error("[supabase-admin] Failed to update gallery bucket:", error.message);
    }
  }

  _bucketReady = true;
}
