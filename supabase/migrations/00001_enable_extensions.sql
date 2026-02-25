/*
  # Enable PostgreSQL extensions
  
  Required for the notification pipeline:
  - pg_cron: scheduler for periodic jobs directly in PostgreSQL
  - pg_net: async HTTP client to call Edge Functions from triggers/cron
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
