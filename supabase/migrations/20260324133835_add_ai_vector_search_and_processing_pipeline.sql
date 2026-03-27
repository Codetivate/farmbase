/*
  # AI Vector Search & Processing Pipeline

  Enables pgvector for semantic search, pg_trgm for fuzzy text matching,
  and creates the AI processing job queue for scalable background work.

  1. Extensions Enabled
    - `vector` (pgvector 0.8.0) - Vector embeddings for semantic search
    - `pg_trgm` - Trigram-based fuzzy text search

  2. New Tables
    - `embeddings`
      - `id` (uuid, primary key)
      - `source_type` (text) - What generated this: knowledge_node, paper, innovation, etc.
      - `source_id` (uuid) - ID of the source record
      - `embedding_model` (text) - Model used: text-embedding-3-small, gte-small, etc.
      - `embedding` (vector(1536)) - The actual embedding vector
      - `content_hash` (text) - Hash of source content to detect changes
      - `chunk_index` (int) - For chunked documents, which chunk this is
      - `chunk_text` (text) - The text chunk that was embedded
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `search_index`
      - `id` (uuid, primary key)
      - `source_type` (text) - Type of indexed content
      - `source_id` (uuid) - Reference to source record
      - `title` (text) - Searchable title
      - `content_preview` (text) - First ~500 chars for display
      - `full_text_search` (tsvector) - PostgreSQL full-text search vector
      - `domain` (text) - Knowledge domain
      - `tags` (text[]) - Tags for filtering
      - `relevance_boost` (numeric) - Manual relevance boost factor
      - `last_indexed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `ai_processing_jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users) - Who requested this job
      - `job_type` (text) - Type: embed, summarize, extract, analyze, classify, translate
      - `priority` (int) - Job priority 1-10 (10 = highest)
      - `status` (text) - pending, processing, completed, failed, cancelled
      - `input_data` (jsonb) - Input payload for the job
      - `output_data` (jsonb) - Result payload from the job
      - `error_message` (text) - Error details if failed
      - `ai_model` (text) - Which AI model to use
      - `ai_provider` (text) - Provider: openai, anthropic, local, etc.
      - `tokens_used` (int) - Token count for cost tracking
      - `processing_time_ms` (int) - How long the job took
      - `retry_count` (int) - Number of retry attempts
      - `max_retries` (int) - Maximum retries allowed
      - `scheduled_at` (timestamptz) - When to start processing
      - `started_at` (timestamptz) - When processing began
      - `completed_at` (timestamptz) - When processing finished
      - `created_at` (timestamptz)

    - `ai_model_configs`
      - `id` (uuid, primary key)
      - `model_name` (text, unique) - Model identifier
      - `provider` (text) - Provider name
      - `model_type` (text) - Type: embedding, chat, completion, classification
      - `max_tokens` (int) - Max token limit
      - `cost_per_1k_input` (numeric) - Cost per 1k input tokens
      - `cost_per_1k_output` (numeric) - Cost per 1k output tokens
      - `is_active` (boolean) - Whether this model is available
      - `rate_limit_rpm` (int) - Requests per minute limit
      - `config` (jsonb) - Additional model configuration
      - `created_at`, `updated_at` (timestamptz)

  3. Security
    - RLS on all tables
    - Users access their own embeddings and jobs
    - Search index readable by all authenticated users
    - Model configs readable by all, writable by admins only

  4. Indexes
    - HNSW index on vector embeddings for fast ANN search
    - GIN index on tsvector for full-text search
    - GIN on tags for array containment queries
    - Trigram index on search titles for fuzzy matching
    - Composite indexes on job queue for efficient polling
*/

-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET search_path TO public, extensions;

-- Enable trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Embeddings: Vector representations of knowledge
CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  embedding extensions.vector(1536),
  content_hash text NOT NULL DEFAULT '',
  chunk_index int NOT NULL DEFAULT 0,
  chunk_text text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read embeddings"
  ON embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert embeddings"
  ON embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update embeddings"
  ON embeddings FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete embeddings"
  ON embeddings FOR DELETE
  TO authenticated
  USING (is_admin());

-- Search Index: Unified full-text search across all content
CREATE TABLE IF NOT EXISTS search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content_preview text NOT NULL DEFAULT '',
  full_text_search tsvector,
  domain text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  relevance_boost numeric NOT NULL DEFAULT 1.0,
  last_indexed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read search index"
  ON search_index FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert to search index"
  ON search_index FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update search index"
  ON search_index FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete from search index"
  ON search_index FOR DELETE
  TO authenticated
  USING (is_admin());

-- AI Processing Jobs: Async job queue for AI tasks
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  job_type text NOT NULL,
  priority int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text NOT NULL DEFAULT '',
  ai_model text NOT NULL DEFAULT '',
  ai_provider text NOT NULL DEFAULT '',
  tokens_used int NOT NULL DEFAULT 0,
  processing_time_ms int NOT NULL DEFAULT 0,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own processing jobs"
  ON ai_processing_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all processing jobs"
  ON ai_processing_jobs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own processing jobs"
  ON ai_processing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own processing jobs"
  ON ai_processing_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- AI Model Configs: Track available models and costs
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT '',
  model_type text NOT NULL DEFAULT 'chat',
  max_tokens int NOT NULL DEFAULT 4096,
  cost_per_1k_input numeric NOT NULL DEFAULT 0,
  cost_per_1k_output numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  rate_limit_rpm int NOT NULL DEFAULT 60,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_model_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read model configs"
  ON ai_model_configs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert model configs"
  ON ai_model_configs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update model configs"
  ON ai_model_configs FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete model configs"
  ON ai_model_configs FOR DELETE
  TO authenticated
  USING (is_admin());

-- HNSW index for fast approximate nearest neighbor search on embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings
  USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_embeddings_hash ON embeddings(content_hash);

-- Full-text search GIN index
CREATE INDEX IF NOT EXISTS idx_search_index_fts ON search_index USING GIN(full_text_search);
CREATE INDEX IF NOT EXISTS idx_search_index_source ON search_index(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_search_index_tags ON search_index USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_search_index_domain ON search_index(domain);

-- Trigram index for fuzzy title matching
CREATE INDEX IF NOT EXISTS idx_search_index_title_trgm ON search_index
  USING GIN(title extensions.gin_trgm_ops);

-- Job queue indexes for efficient polling
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_priority ON ai_processing_jobs(status, priority DESC)
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_type ON ai_processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_scheduled ON ai_processing_jobs(scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_model_configs_active ON ai_model_configs(is_active)
  WHERE is_active = true;

-- Helper function: Semantic search by vector similarity
CREATE OR REPLACE FUNCTION search_by_embedding(
  query_embedding extensions.vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  chunk_text text,
  similarity float
) AS $$
  SELECT
    e.id,
    e.source_type,
    e.source_id,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE
    (filter_source_type IS NULL OR e.source_type = filter_source_type)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;

-- Helper function: Hybrid search (vector + full-text)
CREATE OR REPLACE FUNCTION hybrid_search(
  search_query text,
  query_embedding extensions.vector(1536) DEFAULT NULL,
  match_count int DEFAULT 20,
  filter_domain text DEFAULT NULL
)
RETURNS TABLE (
  source_type text,
  source_id uuid,
  title text,
  content_preview text,
  fts_rank float,
  vector_similarity float,
  combined_score float
) AS $$
  SELECT
    si.source_type,
    si.source_id,
    si.title,
    si.content_preview,
    COALESCE(ts_rank(si.full_text_search, plainto_tsquery('english', search_query)), 0)::float AS fts_rank,
    COALESCE(
      CASE WHEN query_embedding IS NOT NULL THEN
        (SELECT MAX(1 - (e.embedding <=> query_embedding))
         FROM embeddings e
         WHERE e.source_type = si.source_type AND e.source_id = si.source_id)
      ELSE 0 END,
      0
    )::float AS vector_similarity,
    (
      COALESCE(ts_rank(si.full_text_search, plainto_tsquery('english', search_query)), 0) * 0.4 * si.relevance_boost
      + COALESCE(
          CASE WHEN query_embedding IS NOT NULL THEN
            (SELECT MAX(1 - (e.embedding <=> query_embedding))
             FROM embeddings e
             WHERE e.source_type = si.source_type AND e.source_id = si.source_id)
          ELSE 0 END,
          0
        ) * 0.6
    )::float AS combined_score
  FROM search_index si
  WHERE
    (filter_domain IS NULL OR si.domain = filter_domain)
    AND (
      si.full_text_search @@ plainto_tsquery('english', search_query)
      OR search_query = ''
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
