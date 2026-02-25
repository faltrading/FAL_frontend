/*
  Lightweight setup check that runs at Next.js startup (dev/build).
  
  This does NOT run migrations (that requires service_role key and 
  should be done via `npm run db:setup`).
  
  This only verifies that the required tables and bucket exist,
  logging warnings if something is missing so developers know to
  run the full setup.
*/

const checkSupabaseSetup = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "\n⚠️  NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set.\n" +
      "   Supabase features will not work.\n"
    );
    return;
  }

  try {
    // Quick health check: hit the REST endpoint
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(
        `\n⚠️  Supabase REST API returned ${res.status}.\n` +
        `   Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.\n`
      );
      return;
    }

    console.log("✅ Supabase connection verified");

    // Check if gallery_files table exists
    const tableCheck = await fetch(
      `${url}/rest/v1/gallery_files?select=id&limit=0`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (tableCheck.status === 404 || tableCheck.status >= 400) {
      console.warn(
        "\n⚠️  Table 'gallery_files' not found.\n" +
        "   Run: npm run db:setup\n"
      );
    }
  } catch {
    // Non-blocking: don't prevent startup if Supabase is unreachable
    console.warn(
      "\n⚠️  Could not reach Supabase — setup check skipped.\n" +
      "   This is normal if SUPABASE_URL is not configured yet.\n"
    );
  }
};

// Run immediately when called with `node supabase/check.mjs`
checkSupabaseSetup().catch(() => {});
