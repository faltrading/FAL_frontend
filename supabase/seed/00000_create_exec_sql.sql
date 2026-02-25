/*
  # exec_sql RPC helper
  
  Creates a PostgreSQL function that allows executing arbitrary SQL
  via Supabase's RPC endpoint. This is needed by the setup script
  to run migration files through the REST API.
  
  SECURITY: This function can only be called with the service_role key
  because it requires postgres/superuser-level access.
  
  Run this ONCE manually in the Supabase SQL Editor before the first setup:
  
    1. Go to Supabase Dashboard > SQL Editor
    2. Paste this entire file
    3. Click "Run"
  
  After that, the setup.mjs script can execute all migrations automatically.
*/

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Only allow service_role to call this function
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION exec_sql(text) FROM authenticated;
