/*
  # Gold Flowcon - Core Schema

  1. New Tables
    - `crops`
      - `id` (uuid, primary key)
      - `name` (text) - Display name (e.g., "Enoki Mushroom")
      - `scientific_name` (text) - Latin name (e.g., "Flammulina velutipes")
      - `category` (text) - Category tag (e.g., "mushroom", "leafy_green")
      - `optimal_conditions` (jsonb) - Schema-agnostic environmental params
      - `growth_params` (jsonb) - Logistic growth model parameters (K, r, t0)
      - `market_data` (jsonb) - Price per kg, demand index, seasonality
      - `tags` (text[]) - Searchable tags for discovery
      - `image_url` (text) - Hero image URL
      - `created_at` (timestamptz)

    - `research_citations`
      - `id` (uuid, primary key)
      - `crop_id` (uuid, FK to crops)
      - `title` (text) - Paper title
      - `authors` (text) - Author list
      - `journal` (text) - Journal name
      - `year` (int) - Publication year
      - `doi` (text) - DOI link
      - `summary` (text) - AI-generated summary
      - `confidence_score` (numeric) - Model confidence 0-100
      - `created_at` (timestamptz)

    - `simulations`
      - `id` (uuid, primary key)
      - `crop_id` (uuid, FK to crops)
      - `environment_params` (jsonb) - Temp, humidity, CO2, light
      - `growth_output` (jsonb) - Height, health, biomass over time
      - `roi_estimate` (jsonb) - Revenue, cost, net ROI
      - `status` (text) - running, completed, failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for crops and citations (research data)
    - Authenticated write for simulations
*/

CREATE TABLE IF NOT EXISTS crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scientific_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  optimal_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  growth_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read crops"
  ON crops FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert crops"
  ON crops FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS research_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES crops(id),
  title text NOT NULL,
  authors text NOT NULL DEFAULT '',
  journal text NOT NULL DEFAULT '',
  year int NOT NULL DEFAULT 2024,
  doi text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  confidence_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE research_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read citations"
  ON research_citations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert citations"
  ON research_citations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES crops(id),
  environment_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  growth_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  roi_estimate jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read simulations"
  ON simulations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert simulations"
  ON simulations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own simulations"
  ON simulations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
