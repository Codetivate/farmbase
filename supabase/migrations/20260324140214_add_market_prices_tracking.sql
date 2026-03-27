/*
  # Add Market Prices Tracking System

  1. New Tables
    - `market_prices` - Stores current and historical crop market prices
      - `id` (uuid, primary key)
      - `crop_id` (uuid, references crops)
      - `crop_name` (text) - Denormalized for fast lookups
      - `price_per_kg_usd` (numeric) - International price in USD
      - `price_per_kg_thb` (numeric) - Thai market price in THB
      - `usd_thb_rate` (numeric) - Exchange rate at time of capture
      - `source` (text) - Data source identifier (e.g. 'nabc_th', 'commodities_api', 'manual')
      - `source_url` (text) - URL of the data source
      - `market_region` (text) - 'thailand', 'international', 'both'
      - `demand_index` (numeric) - Current demand indicator 0-1
      - `price_change_pct` (numeric) - Percentage change from previous price
      - `previous_price_usd` (numeric) - Previous price for trend calculation
      - `capex_per_sqm_usd` (numeric) - Capital expenditure per sqm
      - `opex_per_cycle_usd` (numeric) - Operating expenditure per cycle
      - `yield_per_sqm_kg` (numeric) - Expected yield per sqm
      - `seasonality` (text[]) - Seasonal tags
      - `fetched_at` (timestamptz) - When the data was fetched
      - `is_latest` (boolean) - Whether this is the most recent price
      - `created_at` (timestamptz)

    - `market_price_config` - Config for automated price fetching per crop
      - `id` (uuid, primary key)
      - `crop_id` (uuid, references crops)
      - `crop_name_query` (text) - Search term for API lookups
      - `commodity_symbol` (text) - Commodity API symbol
      - `nabc_commodity_code` (text) - Thai NABC API code
      - `auto_update_enabled` (boolean)
      - `update_frequency_hours` (integer) - How often to update
      - `last_updated_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Authenticated users can read market_prices
    - Only service role can insert/update (via edge functions)

  3. Indexes
    - Composite index on crop_id + is_latest for fast current price lookups
    - Index on fetched_at for time-series queries
*/

CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  crop_name text NOT NULL DEFAULT '',
  price_per_kg_usd numeric NOT NULL DEFAULT 0,
  price_per_kg_thb numeric NOT NULL DEFAULT 0,
  usd_thb_rate numeric NOT NULL DEFAULT 34.5,
  source text NOT NULL DEFAULT 'manual',
  source_url text NOT NULL DEFAULT '',
  market_region text NOT NULL DEFAULT 'both',
  demand_index numeric NOT NULL DEFAULT 0.5,
  price_change_pct numeric NOT NULL DEFAULT 0,
  previous_price_usd numeric NOT NULL DEFAULT 0,
  capex_per_sqm_usd numeric NOT NULL DEFAULT 0,
  opex_per_cycle_usd numeric NOT NULL DEFAULT 0,
  yield_per_sqm_kg numeric NOT NULL DEFAULT 0,
  seasonality text[] NOT NULL DEFAULT '{}',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  is_latest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market prices"
  ON market_prices FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert market prices"
  ON market_prices FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update market prices"
  ON market_prices FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_market_prices_crop_latest
  ON market_prices (crop_id, is_latest)
  WHERE is_latest = true;

CREATE INDEX IF NOT EXISTS idx_market_prices_fetched_at
  ON market_prices (fetched_at DESC);

CREATE TABLE IF NOT EXISTS market_price_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  crop_name_query text NOT NULL DEFAULT '',
  commodity_symbol text NOT NULL DEFAULT '',
  nabc_commodity_code text NOT NULL DEFAULT '',
  auto_update_enabled boolean NOT NULL DEFAULT true,
  update_frequency_hours integer NOT NULL DEFAULT 24,
  last_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_price_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price config"
  ON market_price_config FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage price config"
  ON market_price_config FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update price config"
  ON market_price_config FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
