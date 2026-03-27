/*
  # User Interactions & Feedback Loop

  Creates tables for tracking user search behavior, ratings, bookmarks,
  and feedback that feeds back into the AI system for continuous improvement.
  This is the "Big Data" collection layer that powers personalization and
  AI model refinement.

  1. New Tables
    - `search_queries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `query_text` (text) - The raw search query
      - `query_type` (text) - semantic, keyword, hybrid, natural_language
      - `filters_applied` (jsonb) - Domain, date range, tags, etc.
      - `results_count` (int) - How many results were returned
      - `results_clicked` (uuid[]) - Which results the user clicked
      - `session_id` (text) - Browser session for grouping queries
      - `response_time_ms` (int) - How fast the search responded
      - `ai_model_used` (text) - Which model processed the query
      - `created_at` (timestamptz)

    - `search_result_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `search_query_id` (uuid, FK to search_queries)
      - `result_source_type` (text) - Type of result clicked
      - `result_source_id` (uuid) - Which result was interacted with
      - `interaction_type` (text) - click, expand, copy, share, bookmark, dismiss
      - `position_in_results` (int) - Rank position when clicked
      - `dwell_time_ms` (int) - How long user spent on result
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `content_ratings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `content_type` (text) - knowledge_node, innovation, paper, search_result
      - `content_id` (uuid) - What was rated
      - `rating` (int) - 1-5 star rating
      - `rating_dimension` (text) - accuracy, usefulness, clarity, novelty
      - `comment` (text) - Optional text feedback
      - `created_at` (timestamptz)
      - UNIQUE constraint on (user_id, content_type, content_id, rating_dimension)

    - `bookmarks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `content_type` (text) - What type of content
      - `content_id` (uuid) - Reference to the content
      - `folder` (text) - Optional folder/category for organizing
      - `notes` (text) - Personal notes
      - `created_at` (timestamptz)
      - UNIQUE constraint on (user_id, content_type, content_id)

    - `ai_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `feedback_type` (text) - summary_quality, wrong_answer, missing_info, hallucination, great_result
      - `source_type` (text) - What AI output this feedback is about
      - `source_id` (uuid) - ID of the AI output
      - `original_output` (text) - The AI output being rated
      - `corrected_output` (text) - User's correction if applicable
      - `severity` (text) - low, medium, high, critical
      - `status` (text) - open, acknowledged, incorporated, dismissed
      - `admin_notes` (text) - Admin response
      - `incorporated_at` (timestamptz) - When feedback was used to improve AI
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique FK to auth.users)
      - `preferred_domains` (text[]) - Favorite domains
      - `preferred_language` (text) - Content language
      - `search_defaults` (jsonb) - Default search settings
      - `notification_settings` (jsonb) - What to be notified about
      - `ai_personalization` (jsonb) - AI behavior preferences
      - `display_settings` (jsonb) - UI preferences
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - RLS on all tables
    - Users can only access their own interaction data
    - Admins can read all for analytics
    - No cross-user data leakage

  3. Indexes
    - Time-series indexes for analytics queries
    - Composite indexes for common aggregations
    - Unique constraints to prevent duplicate ratings/bookmarks
*/

-- Search Queries: Track what users search for
CREATE TABLE IF NOT EXISTS search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  query_text text NOT NULL DEFAULT '',
  query_type text NOT NULL DEFAULT 'hybrid',
  filters_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  results_count int NOT NULL DEFAULT 0,
  results_clicked uuid[] NOT NULL DEFAULT '{}',
  session_id text NOT NULL DEFAULT '',
  response_time_ms int NOT NULL DEFAULT 0,
  ai_model_used text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own search queries"
  ON search_queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all search queries"
  ON search_queries FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own search queries"
  ON search_queries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Search Result Interactions: Clicks, expands, etc.
CREATE TABLE IF NOT EXISTS search_result_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  search_query_id uuid REFERENCES search_queries(id),
  result_source_type text NOT NULL DEFAULT '',
  result_source_id uuid NOT NULL,
  interaction_type text NOT NULL DEFAULT 'click',
  position_in_results int NOT NULL DEFAULT 0,
  dwell_time_ms int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE search_result_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interactions"
  ON search_result_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all interactions"
  ON search_result_interactions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own interactions"
  ON search_result_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Content Ratings: Stars + dimension ratings
CREATE TABLE IF NOT EXISTS content_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  rating int NOT NULL DEFAULT 3,
  rating_dimension text NOT NULL DEFAULT 'usefulness',
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT unique_user_rating UNIQUE (user_id, content_type, content_id, rating_dimension)
);

ALTER TABLE content_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ratings"
  ON content_ratings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all ratings"
  ON content_ratings FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own ratings"
  ON content_ratings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings"
  ON content_ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings"
  ON content_ratings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Bookmarks: Save content for later
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  folder text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_bookmark UNIQUE (user_id, content_type, content_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookmarks"
  ON bookmarks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- AI Feedback: User corrections and quality feedback on AI outputs
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  feedback_type text NOT NULL DEFAULT 'summary_quality',
  source_type text NOT NULL DEFAULT '',
  source_id uuid NOT NULL,
  original_output text NOT NULL DEFAULT '',
  corrected_output text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  admin_notes text NOT NULL DEFAULT '',
  incorporated_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all ai feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own ai feedback"
  ON ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ai feedback"
  ON ai_feedback FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all ai feedback"
  ON ai_feedback FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- User Preferences: Personalization settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  preferred_domains text[] NOT NULL DEFAULT '{}',
  preferred_language text NOT NULL DEFAULT 'en',
  search_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_settings jsonb NOT NULL DEFAULT '{"email_digest": false, "new_papers": false, "feedback_updates": true}'::jsonb,
  ai_personalization jsonb NOT NULL DEFAULT '{"response_length": "medium", "technical_level": "intermediate"}'::jsonb,
  display_settings jsonb NOT NULL DEFAULT '{"theme": "system", "results_per_page": 20}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for analytics and performance
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_session ON search_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_type ON search_queries(query_type);

CREATE INDEX IF NOT EXISTS idx_search_interactions_user ON search_result_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_interactions_query ON search_result_interactions(search_query_id);
CREATE INDEX IF NOT EXISTS idx_search_interactions_type ON search_result_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_search_interactions_created ON search_result_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_ratings_content ON content_ratings(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_ratings_user ON content_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_ratings_dimension ON content_ratings(rating_dimension);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_content ON bookmarks(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(user_id, folder);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON ai_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_status ON ai_feedback(status);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_severity ON ai_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_source ON ai_feedback(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_feedback(created_at DESC);
