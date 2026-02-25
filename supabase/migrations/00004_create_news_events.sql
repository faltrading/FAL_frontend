/*
  # News events table
  
  Cache for economic calendar events fetched from external sources.
  Used by the cron job to check for upcoming events and trigger push notifications.
*/

CREATE TABLE IF NOT EXISTS news_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  country text NOT NULL,
  event_date timestamptz NOT NULL,
  impact text NOT NULL,
  forecast text DEFAULT '',
  previous text DEFAULT '',
  actual text DEFAULT '',
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view news events"
  ON news_events FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_news_events_date ON news_events(event_date);
CREATE INDEX IF NOT EXISTS idx_news_events_impact ON news_events(impact);
