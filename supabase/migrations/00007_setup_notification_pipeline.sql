/*
  # Notification pipeline: cron job + trigger + Edge Function call
  
  Pipeline:
  1. pg_cron runs check_upcoming_news_notifications() every 10 minutes
  2. Function finds events happening in the next 20 minutes (High/Medium impact)
     that haven't already been queued
  3. New rows inserted into push_notifications_queue
  4. AFTER INSERT trigger calls fn_send_push_notification()
  5. fn_send_push_notification() uses pg_net to POST to the Edge Function
  
  Vault secrets required (set via Supabase Dashboard or setup script):
  - 'project_url': the Supabase project URL
  - 'service_role_key': the service_role key for authenticating Edge Function calls
*/

-- 1. Store secrets in Vault (idempotent: only inserts if not already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret(current_setting('app.settings.project_url', true), 'project_url');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    PERFORM vault.create_secret(current_setting('app.settings.service_role_key', true), 'service_role_key');
  END IF;
END
$$;

-- 2. Function: find upcoming events and enqueue them
CREATE OR REPLACE FUNCTION check_upcoming_news_notifications()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  upcoming_event RECORD;
BEGIN
  FOR upcoming_event IN
    SELECT DISTINCT ne.title, ne.country, ne.event_date, ne.impact
    FROM news_events ne
    WHERE ne.event_date > now()
      AND ne.event_date <= now() + interval '20 minutes'
      AND ne.impact IN ('High', 'Medium')
      AND NOT EXISTS (
        SELECT 1 FROM push_notifications_queue pnq
        WHERE pnq.event_title = ne.title
          AND pnq.event_date = ne.event_date
          AND pnq.event_country = ne.country
      )
  LOOP
    INSERT INTO push_notifications_queue (event_title, event_country, event_date, event_impact)
    VALUES (upcoming_event.title, upcoming_event.country, upcoming_event.event_date, upcoming_event.impact);
  END LOOP;
END;
$$;

-- 3. Trigger function: call the Edge Function via pg_net
CREATE OR REPLACE FUNCTION fn_send_push_notification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'event_title', NEW.event_title,
      'event_country', NEW.event_country,
      'event_date', NEW.event_date,
      'event_impact', NEW.event_impact
    )
  );

  UPDATE push_notifications_queue SET processed = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 4. Trigger on the queue table
DROP TRIGGER IF EXISTS trigger_push_notification ON push_notifications_queue;
CREATE TRIGGER trigger_push_notification
  AFTER INSERT ON push_notifications_queue
  FOR EACH ROW
  EXECUTE FUNCTION fn_send_push_notification();

-- 5. Cron job: every 10 minutes check for upcoming events
SELECT cron.schedule(
  'check-upcoming-news-events',
  '*/10 * * * *',
  $$SELECT check_upcoming_news_notifications()$$
);
