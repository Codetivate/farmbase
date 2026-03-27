/*
  # API/Webhook Integration Hub

  Creates a flexible plug-in architecture for connecting external APIs and
  receiving webhooks, similar to how TikTok, Zapier, and other world-class
  platforms handle third-party integrations.

  1. New Tables
    - `api_connectors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users) - Owner of this connector
      - `connector_name` (text) - Display name: "OpenAI", "PubMed", "Arxiv", etc.
      - `connector_type` (text) - Type: rest_api, graphql, webhook_sender, webhook_receiver, oauth2
      - `base_url` (text) - Base URL for the API
      - `auth_type` (text) - none, api_key, bearer, oauth2, basic
      - `auth_config` (jsonb) - Encrypted auth configuration (header names, etc.)
      - `headers_template` (jsonb) - Default headers to send
      - `rate_limit_rpm` (int) - Requests per minute this connector allows
      - `timeout_ms` (int) - Request timeout in milliseconds
      - `retry_policy` (jsonb) - Retry config: max_retries, backoff_multiplier
      - `is_active` (boolean)
      - `health_status` (text) - healthy, degraded, down, unknown
      - `last_health_check` (timestamptz)
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)

    - `api_endpoints`
      - `id` (uuid, primary key)
      - `connector_id` (uuid, FK to api_connectors)
      - `endpoint_name` (text) - Descriptive name: "Search Papers", "Get Embeddings"
      - `http_method` (text) - GET, POST, PUT, DELETE, PATCH
      - `path_template` (text) - URL path with placeholders: /v1/search/{query}
      - `request_body_template` (jsonb) - Template for request body
      - `response_mapping` (jsonb) - How to map response to our schema
      - `cache_ttl_seconds` (int) - How long to cache responses
      - `is_active` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `webhook_endpoints`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `endpoint_name` (text) - Name for this webhook
      - `endpoint_path` (text, unique) - Unique path: /webhooks/{uuid}
      - `secret_hash` (text) - Hashed secret for signature verification
      - `allowed_ips` (text[]) - IP whitelist (empty = all allowed)
      - `event_types` (text[]) - Which events to listen for
      - `destination_type` (text) - Where to route: edge_function, api_connector, processing_job
      - `destination_config` (jsonb) - Configuration for the destination
      - `is_active` (boolean)
      - `last_received_at` (timestamptz)
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)

    - `webhook_events`
      - `id` (uuid, primary key)
      - `webhook_endpoint_id` (uuid, FK to webhook_endpoints)
      - `event_type` (text) - Event category
      - `payload` (jsonb) - The received payload
      - `headers` (jsonb) - Request headers (sanitized)
      - `source_ip` (text) - Sender IP
      - `signature_valid` (boolean) - Whether signature was verified
      - `processing_status` (text) - received, processing, processed, failed
      - `processing_result` (jsonb) - Result of processing
      - `error_message` (text)
      - `processed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `api_call_log`
      - `id` (uuid, primary key)
      - `connector_id` (uuid, FK to api_connectors)
      - `endpoint_id` (uuid, nullable FK to api_endpoints)
      - `user_id` (uuid, FK to auth.users)
      - `http_method` (text)
      - `url` (text) - Full URL called
      - `request_size_bytes` (int)
      - `response_status` (int) - HTTP status code
      - `response_size_bytes` (int)
      - `response_time_ms` (int)
      - `is_cached` (boolean) - Whether response came from cache
      - `error_message` (text)
      - `created_at` (timestamptz)

    - `integration_schedules`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `connector_id` (uuid, FK to api_connectors)
      - `endpoint_id` (uuid, FK to api_endpoints)
      - `schedule_name` (text)
      - `cron_expression` (text) - Cron schedule
      - `input_params` (jsonb) - Parameters to pass
      - `is_active` (boolean)
      - `last_run_at` (timestamptz)
      - `next_run_at` (timestamptz)
      - `last_run_status` (text)
      - `run_count` (int)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - RLS on all tables
    - Users manage their own connectors and webhooks
    - Admins have full access for monitoring
    - Webhook secrets never exposed in reads
    - API call logs visible only to owner and admins

  3. Indexes
    - Unique constraint on webhook paths
    - Time-based indexes for log retention and analytics
    - Status indexes for monitoring dashboards
*/

-- API Connectors: External API configurations
CREATE TABLE IF NOT EXISTS api_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  connector_name text NOT NULL,
  connector_type text NOT NULL DEFAULT 'rest_api',
  base_url text NOT NULL DEFAULT '',
  auth_type text NOT NULL DEFAULT 'none',
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  headers_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_limit_rpm int NOT NULL DEFAULT 60,
  timeout_ms int NOT NULL DEFAULT 30000,
  retry_policy jsonb NOT NULL DEFAULT '{"max_retries": 3, "backoff_multiplier": 2}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  health_status text NOT NULL DEFAULT 'unknown',
  last_health_check timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own connectors"
  ON api_connectors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all connectors"
  ON api_connectors FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own connectors"
  ON api_connectors FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own connectors"
  ON api_connectors FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own connectors"
  ON api_connectors FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- API Endpoints: Specific endpoints within a connector
CREATE TABLE IF NOT EXISTS api_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES api_connectors(id),
  endpoint_name text NOT NULL,
  http_method text NOT NULL DEFAULT 'GET',
  path_template text NOT NULL DEFAULT '',
  request_body_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  cache_ttl_seconds int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read endpoints of own connectors"
  ON api_endpoints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_connectors
      WHERE api_connectors.id = api_endpoints.connector_id
      AND api_connectors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all endpoints"
  ON api_endpoints FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert endpoints for own connectors"
  ON api_endpoints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_connectors
      WHERE api_connectors.id = api_endpoints.connector_id
      AND api_connectors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update endpoints of own connectors"
  ON api_endpoints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_connectors
      WHERE api_connectors.id = api_endpoints.connector_id
      AND api_connectors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_connectors
      WHERE api_connectors.id = api_endpoints.connector_id
      AND api_connectors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete endpoints of own connectors"
  ON api_endpoints FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_connectors
      WHERE api_connectors.id = api_endpoints.connector_id
      AND api_connectors.user_id = auth.uid()
    )
  );

-- Webhook Endpoints: Incoming webhook receivers
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  endpoint_name text NOT NULL,
  endpoint_path text NOT NULL UNIQUE,
  secret_hash text NOT NULL DEFAULT '',
  allowed_ips text[] NOT NULL DEFAULT '{}',
  event_types text[] NOT NULL DEFAULT '{}',
  destination_type text NOT NULL DEFAULT 'processing_job',
  destination_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_received_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own webhooks"
  ON webhook_endpoints FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all webhooks"
  ON webhook_endpoints FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own webhooks"
  ON webhook_endpoints FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own webhooks"
  ON webhook_endpoints FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own webhooks"
  ON webhook_endpoints FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Webhook Events: Log of received webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id),
  event_type text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ip text NOT NULL DEFAULT '',
  signature_valid boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received',
  processing_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text NOT NULL DEFAULT '',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read events for own webhooks"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webhook_endpoints
      WHERE webhook_endpoints.id = webhook_events.webhook_endpoint_id
      AND webhook_endpoints.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Authenticated can insert webhook events"
  ON webhook_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update webhook events"
  ON webhook_events FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- API Call Log: Track all outgoing API calls
CREATE TABLE IF NOT EXISTS api_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES api_connectors(id),
  endpoint_id uuid REFERENCES api_endpoints(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  http_method text NOT NULL DEFAULT 'GET',
  url text NOT NULL DEFAULT '',
  request_size_bytes int NOT NULL DEFAULT 0,
  response_status int NOT NULL DEFAULT 0,
  response_size_bytes int NOT NULL DEFAULT 0,
  response_time_ms int NOT NULL DEFAULT 0,
  is_cached boolean NOT NULL DEFAULT false,
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api call logs"
  ON api_call_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all api call logs"
  ON api_call_log FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Authenticated can insert api call logs"
  ON api_call_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Integration Schedules: Cron-like scheduled API calls
CREATE TABLE IF NOT EXISTS integration_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  connector_id uuid NOT NULL REFERENCES api_connectors(id),
  endpoint_id uuid NOT NULL REFERENCES api_endpoints(id),
  schedule_name text NOT NULL,
  cron_expression text NOT NULL DEFAULT '0 */6 * * *',
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_run_status text NOT NULL DEFAULT 'pending',
  run_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integration_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own schedules"
  ON integration_schedules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all schedules"
  ON integration_schedules FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own schedules"
  ON integration_schedules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own schedules"
  ON integration_schedules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own schedules"
  ON integration_schedules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_connectors_user ON api_connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_api_connectors_type ON api_connectors(connector_type);
CREATE INDEX IF NOT EXISTS idx_api_connectors_health ON api_connectors(health_status);
CREATE INDEX IF NOT EXISTS idx_api_connectors_active ON api_connectors(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_api_endpoints_connector ON api_endpoints(connector_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_active ON api_endpoints(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_path ON webhook_endpoints(endpoint_path);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_events_endpoint ON webhook_events(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_call_log_connector ON api_call_log(connector_id);
CREATE INDEX IF NOT EXISTS idx_api_call_log_user ON api_call_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_log_created ON api_call_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_log_status ON api_call_log(response_status);

CREATE INDEX IF NOT EXISTS idx_integration_schedules_user ON integration_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_schedules_active ON integration_schedules(is_active, next_run_at)
  WHERE is_active = true;
