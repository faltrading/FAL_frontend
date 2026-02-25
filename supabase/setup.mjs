/*
  Supabase Bucket & Migration Setup Script
  =========================================
  
  This script runs the full database setup for the FAL frontend:
  1. Creates the "gallery" storage bucket (requires SUPABASE_SERVICE_ROLE_KEY)
  2. Executes all SQL migrations in order (requires SUPABASE_SERVICE_ROLE_KEY)
  
  WHY SERVICE_ROLE_KEY IS REQUIRED:
  - The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is subject to RLS and cannot:
    * Create storage buckets (admin-only operation)
    * Create tables, indexes, policies (DDL operations)
    * Access vault secrets
    * Manage pg_cron jobs
  - The service_role key bypasses RLS and has full admin access
  
  Environment variables needed:
  - NEXT_PUBLIC_SUPABASE_URL     (project URL, same as frontend uses)
  - SUPABASE_SERVICE_ROLE_KEY    (secret, never exposed to browser)
  
  Usage:
    node supabase/setup.mjs
*/

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing environment variables.\n" +
    "   Required:\n" +
    "     NEXT_PUBLIC_SUPABASE_URL\n" +
    "     SUPABASE_SERVICE_ROLE_KEY\n\n" +
    "   The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is NOT sufficient.\n" +
    "   Bucket creation and DDL operations require the service_role key."
  );
  process.exit(1);
}

// Service-role client: bypasses RLS, can create buckets and run DDL
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Create Storage Buckets ─────────────────────────────────────────────────
async function setupBuckets() {
  console.log("\n📦 Setting up storage buckets...\n");

  const { data: existingBuckets, error: listError } =
    await supabaseAdmin.storage.listBuckets();

  if (listError) {
    console.error("  ❌ Failed to list buckets:", listError.message);
    return false;
  }

  const bucketExists = existingBuckets?.some((b) => b.id === "gallery");

  if (bucketExists) {
    console.log("  ✅ Bucket 'gallery' already exists — skipping creation");
  } else {
    const { error: createError } = await supabaseAdmin.storage.createBucket(
      "gallery",
      {
        public: true,
        fileSizeLimit: 52428800, // 50 MB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
          "video/mp4",
          "video/webm",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      }
    );

    if (createError) {
      console.error("  ❌ Failed to create bucket 'gallery':", createError.message);
      return false;
    }
    console.log("  ✅ Bucket 'gallery' created (public, 50MB limit)");
  }

  return true;
}

// ── 2. Run SQL Migrations ─────────────────────────────────────────────────────
async function runMigrations() {
  console.log("\n📋 Running SQL migrations...\n");

  const migrationsDir = join(__dirname, "migrations");
  let files;

  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    console.error("  ❌ No migrations directory found at:", migrationsDir);
    return false;
  }

  if (files.length === 0) {
    console.log("  ⚠️  No migration files found");
    return true;
  }

  let allOk = true;

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, "utf-8").trim();

    if (!sql) {
      console.log(`  ⏭️  ${file} — empty, skipping`);
      continue;
    }

    console.log(`  ⏳ ${file}...`);

    const { error } = await supabaseAdmin.rpc("exec_sql", { query: sql });

    if (error) {
      // Fallback: try via REST SQL endpoint (Supabase Management API)
      // If the rpc doesn't exist, we use the pg_meta endpoint
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown error");
        console.error(`  ❌ ${file} — migration failed: ${errText}`);
        allOk = false;
        // Continue to try remaining migrations
      } else {
        console.log(`  ✅ ${file}`);
      }
    } else {
      console.log(`  ✅ ${file}`);
    }
  }

  return allOk;
}

// ── 3. Verify Setup ──────────────────────────────────────────────────────────
async function verifySetup() {
  console.log("\n🔍 Verifying setup...\n");

  // Check bucket
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const galleryBucket = buckets?.find((b) => b.id === "gallery");
  console.log(
    galleryBucket
      ? "  ✅ Bucket 'gallery' exists"
      : "  ❌ Bucket 'gallery' NOT found"
  );

  // Check tables
  const tables = [
    "gallery_files",
    "push_subscriptions",
    "news_events",
    "push_notifications_queue",
  ];

  for (const table of tables) {
    const { error } = await supabaseAdmin.from(table).select("id").limit(0);
    console.log(
      error
        ? `  ❌ Table '${table}' — ${error.message}`
        : `  ✅ Table '${table}' exists`
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   FAL Frontend — Supabase Database Setup        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  URL: ${SUPABASE_URL}`);
  console.log(`  Key: ${SERVICE_ROLE_KEY.slice(0, 20)}...`);

  const bucketsOk = await setupBuckets();
  const migrationsOk = await runMigrations();
  await verifySetup();

  console.log("\n══════════════════════════════════════════════════");
  if (bucketsOk && migrationsOk) {
    console.log("  ✅ Setup completed successfully!");
  } else {
    console.log("  ⚠️  Setup completed with some errors (see above)");
  }
  console.log("══════════════════════════════════════════════════\n");

  process.exit(bucketsOk && migrationsOk ? 0 : 1);
}

main();
