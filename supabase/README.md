# FAL Frontend — Supabase Database Configuration

## Overview

This folder contains **everything** the frontend needs from Supabase:

```
supabase/
├── migrations/               # SQL migrations (run in order)
│   ├── 00001_enable_extensions.sql
│   ├── 00002_create_gallery_files.sql
│   ├── 00003_create_push_subscriptions.sql
│   ├── 00004_create_news_events.sql
│   ├── 00005_create_push_notifications_queue.sql
│   ├── 00006_create_storage_policies.sql
│   └── 00007_setup_notification_pipeline.sql
├── seed/
│   └── 00000_create_exec_sql.sql   # Run ONCE manually in SQL Editor
├── functions/
│   └── send-push-notification/
│       └── index.ts                # Deno Edge Function
├── setup.mjs                       # Full setup script (buckets + migrations)
├── check.mjs                       # Lightweight startup check
└── README.md
```

## Quick Start

### 1. One-time prerequisite

Run `seed/00000_create_exec_sql.sql` in the **Supabase SQL Editor**. This creates the `exec_sql()` RPC function that allows the setup script to run migrations via the REST API.

### 2. Full setup

```bash
npm run db:setup
```

This requires two environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the **service role** key (NOT the anon key)

The script will:
1. Create the `gallery` storage bucket (public, 50MB limit)
2. Execute all SQL migrations in order
3. Verify that tables and bucket exist

### 3. Development

```bash
npm run dev
```

At startup, a lightweight check runs to verify Supabase connectivity and warn if tables are missing.

## API Keys Explained

| Key | Used By | Can Create Tables? | Can Create Buckets? | RLS |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (browser) | ❌ No | ❌ No | ✅ Enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | Setup script (server) | ✅ Yes | ✅ Yes | ❌ Bypassed |

**The anon key is NOT sufficient for setup operations.** It can only read/write data through RLS policies. All DDL operations (CREATE TABLE, CREATE POLICY, CREATE EXTENSION, pg_cron, Vault) require the service_role key.

## Edge Function Deployment

The `send-push-notification` Edge Function must be deployed separately:

```bash
supabase functions deploy send-push-notification
```

Required Edge Function secrets (set in Supabase Dashboard):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Notification Pipeline

```
pg_cron (every 10 min)
  └─> check_upcoming_news_notifications()
        └─> INSERT into push_notifications_queue
              └─> TRIGGER fn_send_push_notification()
                    └─> pg_net HTTP POST
                          └─> Edge Function: send-push-notification
                                └─> Web Push to user browsers
```
