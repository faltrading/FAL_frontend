import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service_role key.
 * This bypasses RLS and should NEVER be exposed to the browser.
 *
 * Required env vars (NOT prefixed with NEXT_PUBLIC_):
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
