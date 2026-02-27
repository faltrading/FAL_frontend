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

// Supabase Free tier caps at 50 MB per object. When you upgrade to Pro,
// raise this to e.g. 5 * 1024 * 1024 * 1024 (5 GB).
const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB

export async function ensureGalleryBucket(): Promise<void> {
  if (_bucketReady) return;

  const supabase = getSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucket = buckets?.find((b) => b.id === "gallery");

  const opts = {
    public: true,
    fileSizeLimit: FILE_SIZE_LIMIT,
  };

  if (!bucket) {
    const { error } = await supabase.storage.createBucket("gallery", opts);
    if (error) {
      console.error("[supabase-admin] Failed to create gallery bucket:", error.message);
      throw error;
    }
    console.log("[supabase-admin] Created 'gallery' storage bucket");
  } else if (bucket.file_size_limit !== FILE_SIZE_LIMIT) {
    // Fix bucket if it was created with a wrong limit (e.g. 0)
    const { error } = await supabase.storage.updateBucket("gallery", opts);
    if (error) {
      console.error("[supabase-admin] Failed to update gallery bucket:", error.message);
    } else {
      console.log("[supabase-admin] Updated 'gallery' bucket limit to", FILE_SIZE_LIMIT);
    }
  }

  _bucketReady = true;
}
