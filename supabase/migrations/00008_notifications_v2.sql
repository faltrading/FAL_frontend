/*
  # Notifications V2 — Generalized push notification system
  
  Changes:
  1. Updates push_subscriptions.preferences to support three notification categories:
     - news_enabled  (high-priority market news)
     - chat_enabled  (new chat messages)
     - calls_enabled (new call rooms)
  2. Updates the cron function to only trigger on High-impact events.
  3. Updates the trigger function to include type="news" in payload.
  4. Allows the Edge Function to be called externally for chat/call events.
*/

-- 1. Ensure new rows get the updated default preferences
ALTER TABLE push_subscriptions
  ALTER COLUMN preferences
  SET DEFAULT '{
    "news_enabled": true,
    "chat_enabled": true,
    "calls_enabled": true
  }'::jsonb;

-- 2. Backfill existing rows: add the new keys if missing
UPDATE push_subscriptions
SET preferences = preferences
  || jsonb_build_object(
       'news_enabled', true,
       'chat_enabled', true,
       'calls_enabled', true
     )
WHERE NOT (preferences ? 'news_enabled');

-- 3. Update the cron function — only High impact events
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
      AND ne.impact = 'High'
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

-- 4. Update the trigger function — pass type in payload and handle failures gracefully
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

  IF project_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Notification secrets not configured — skipping push';
    UPDATE push_notifications_queue SET processed = true WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'type', 'news',
      'event_title', NEW.event_title,
      'event_country', NEW.event_country,
      'event_date', NEW.event_date,
      'event_impact', NEW.event_impact
    )
  );

  UPDATE push_notifications_queue SET processed = true WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
