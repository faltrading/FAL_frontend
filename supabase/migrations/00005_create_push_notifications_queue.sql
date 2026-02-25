/*
  # Push notifications queue table
  
  Internal queue used by the notification pipeline:
  1. pg_cron job finds upcoming events -> inserts rows here
  2. AFTER INSERT trigger calls Edge Function via pg_net
  3. Edge Function sends Web Push to subscribed users
  
  No user-facing RLS policies: only service_role can access this table.
*/

CREATE TABLE IF NOT EXISTS push_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_title text NOT NULL,
  event_country text NOT NULL,
  event_date timestamptz NOT NULL,
  event_impact text NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_notifications_queue ENABLE ROW LEVEL SECURITY;
-- No user policies: only service_role key can read/write
