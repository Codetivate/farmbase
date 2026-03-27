/*
  # Analytics, Cost Management & System Audit

  Creates the analytics and observability layer for cost tracking, 
  usage analytics, system health monitoring, and comprehensive audit logging.
  This enables saving cost by monitoring AI spend, tracking ROI of features,
  and maintaining a complete audit trail for security compliance.

  1. New Tables
    - `usage_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `event_category` (text) - search, ai_processing, api_call, knowledge, innovation
      - `event_action` (text) - Specific action: query, embed, summarize, create, update
      - `event_label` (text) - Additional context
      - `value_numeric` (numeric) - Quantitative value (tokens, bytes, ms)
      - `value_text` (text) - Qualitative value
      - `session_id` (text) - Session tracking
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `cost_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `cost_category` (text) - ai_tokens, api_calls, storage, compute, bandwidth
      - `provider` (text) - openai, anthropic, supabase, custom
      - `model_name` (text)
      - `input_units` (numeric) - Input tokens/requests/bytes
      - `output_units` (numeric) - Output tokens/responses/bytes
      - `unit_cost` (numeric) - Cost per unit
      - `total_cost` (numeric) - Calculated total cost
      - `currency` (text) - USD, THB, etc.
      - `billing_period` (text) - YYYY-MM format
      - `job_id` (uuid, nullable) - Reference to ai_processing_jobs
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `cost_budgets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `budget_name` (text)
      - `cost_category` (text) - Same as cost_tracking categories
      - `monthly_limit` (numeric) - Monthly budget limit
      - `alert_threshold_pct` (int) - Alert at this percentage (e.g., 80)
      - `current_spend` (numeric) - Current period spend
      - `is_hard_limit` (boolean) - Stop processing if exceeded
      - `is_active` (boolean)
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)

    - `system_audit_log`
      - `id` (uuid, primary key)
      - `actor_id` (uuid, nullable FK to auth.users)
      - `actor_type` (text) - user, system, api_key, webhook, cron
      - `action` (text) - Detailed action: login, create_node, run_search, deploy_connector
      - `resource_type` (text) - Table/entity affected
      - `resource_id` (uuid, nullable) - ID of affected resource
      - `changes` (jsonb) - Before/after snapshot
      - `ip_address` (text)
      - `user_agent` (text)
      - `session_id` (text)
      - `severity` (text) - info, warning, error, critical
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `system_health_checks`
      - `id` (uuid, primary key)
      - `service_name` (text) - database, edge_functions, vector_search, api_connector
      - `check_type` (text) - latency, availability, error_rate, queue_depth
      - `status` (text) - healthy, degraded, down
      - `value_numeric` (numeric) - Measured value
      - `threshold` (numeric) - Threshold for alerting
      - `metadata` (jsonb)
      - `checked_at` (timestamptz)

    - `data_retention_policies`
      - `id` (uuid, primary key)
      - `table_name` (text, unique) - Which table this policy applies to
      - `retention_days` (int) - How many days to keep data
      - `archive_before_delete` (boolean) - Archive to cold storage first
      - `is_active` (boolean)
      - `last_cleanup_at` (timestamptz)
      - `rows_deleted_last` (int) - Rows deleted in last cleanup
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - RLS on all tables
    - Users see their own usage and costs
    - Admins see everything for system management
    - Audit log is append-only (no update/delete for users)
    - Health checks readable by admins only

  3. Indexes
    - Time-series indexes for efficient date-range analytics
    - Composite indexes for cost aggregation queries
    - Partial indexes for active budgets and policies
*/

-- Usage Analytics: Event tracking for big data insights
CREATE TABLE IF NOT EXISTS usage_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  event_category text NOT NULL,
  event_action text NOT NULL,
  event_label text NOT NULL DEFAULT '',
  value_numeric numeric NOT NULL DEFAULT 0,
  value_text text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analytics"
  ON usage_analytics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all analytics"
  ON usage_analytics FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own analytics"
  ON usage_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Cost Tracking: Monitor AI and API spend
CREATE TABLE IF NOT EXISTS cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  cost_category text NOT NULL,
  provider text NOT NULL DEFAULT '',
  model_name text NOT NULL DEFAULT '',
  input_units numeric NOT NULL DEFAULT 0,
  output_units numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT '',
  job_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own costs"
  ON cost_tracking FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all costs"
  ON cost_tracking FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own cost records"
  ON cost_tracking FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Cost Budgets: Spending limits and alerts
CREATE TABLE IF NOT EXISTS cost_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  budget_name text NOT NULL,
  cost_category text NOT NULL,
  monthly_limit numeric NOT NULL DEFAULT 0,
  alert_threshold_pct int NOT NULL DEFAULT 80,
  current_spend numeric NOT NULL DEFAULT 0,
  is_hard_limit boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cost_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own budgets"
  ON cost_budgets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all budgets"
  ON cost_budgets FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own budgets"
  ON cost_budgets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own budgets"
  ON cost_budgets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own budgets"
  ON cost_budgets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- System Audit Log: Comprehensive activity tracking
CREATE TABLE IF NOT EXISTS system_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_type text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  resource_type text NOT NULL DEFAULT '',
  resource_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit entries"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

CREATE POLICY "Admins can read all audit entries"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Authenticated can insert audit entries"
  ON system_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- System Health Checks: Service monitoring
CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  check_type text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  value_numeric numeric NOT NULL DEFAULT 0,
  threshold numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read health checks"
  ON system_health_checks FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Authenticated can insert health checks"
  ON system_health_checks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Data Retention Policies: Automated data lifecycle management
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  retention_days int NOT NULL DEFAULT 365,
  archive_before_delete boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  last_cleanup_at timestamptz,
  rows_deleted_last int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read retention policies"
  ON data_retention_policies FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert retention policies"
  ON data_retention_policies FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update retention policies"
  ON data_retention_policies FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user ON usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_category ON usage_analytics(event_category, event_action);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created ON usage_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_session ON usage_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_user ON cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_category ON cost_tracking(cost_category);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_period ON cost_tracking(billing_period);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_provider ON cost_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_created ON cost_tracking(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_budgets_user ON cost_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_active ON cost_budgets(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_system_audit_actor ON system_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_action ON system_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_system_audit_resource ON system_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_severity ON system_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_system_audit_created ON system_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_checks_service ON system_health_checks(service_name, check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked ON system_health_checks(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_retention_policies_active ON data_retention_policies(is_active) WHERE is_active = true;

-- Insert default retention policies for high-volume tables
INSERT INTO data_retention_policies (table_name, retention_days, archive_before_delete)
VALUES
  ('search_queries', 180, true),
  ('search_result_interactions', 90, false),
  ('usage_analytics', 365, true),
  ('api_call_log', 90, false),
  ('webhook_events', 60, false),
  ('system_health_checks', 30, false),
  ('system_audit_log', 730, true)
ON CONFLICT (table_name) DO NOTHING;
