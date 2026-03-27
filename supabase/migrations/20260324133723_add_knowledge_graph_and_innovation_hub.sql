/*
  # Knowledge Graph & Innovation Hub
  
  This migration creates the core knowledge management system for the AI Search Engine.
  It stores extracted knowledge from research papers, tracks innovations/inventions,
  and maps relationships between concepts as a knowledge graph.

  1. New Tables
    - `knowledge_nodes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users) - Owner who created this node
      - `node_type` (text) - Type: concept, finding, method, material, organism, technique
      - `title` (text) - Short title of the knowledge node
      - `content` (text) - Full text content / summary
      - `source_paper_id` (uuid, nullable FK to paper_submissions) - Original paper source
      - `source_url` (text) - External source URL if not from paper
      - `domain` (text) - Knowledge domain: agriculture, biology, chemistry, etc.
      - `confidence_score` (numeric) - AI confidence in extraction accuracy 0-100
      - `ai_model_used` (text) - Which AI model extracted this
      - `metadata` (jsonb) - Flexible metadata storage
      - `tags` (text[]) - Searchable tags
      - `is_verified` (boolean) - Human-verified flag
      - `verified_by` (uuid, nullable) - Who verified
      - `language` (text) - Content language code
      - `version` (int) - Version tracking for edits
      - `created_at`, `updated_at` (timestamptz)

    - `knowledge_edges`
      - `id` (uuid, primary key)
      - `source_node_id` (uuid, FK to knowledge_nodes)
      - `target_node_id` (uuid, FK to knowledge_nodes)
      - `relationship_type` (text) - Type: derives_from, contradicts, supports, extends, etc.
      - `strength` (numeric) - Relationship strength 0-1
      - `ai_generated` (boolean) - Whether AI created this link
      - `created_by` (uuid, FK to auth.users)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `innovations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users) - Creator
      - `title` (text) - Innovation title
      - `description` (text) - Detailed description
      - `innovation_type` (text) - Type: hypothesis, invention, method, improvement, combination
      - `status` (text) - Status: draft, proposed, testing, validated, archived
      - `derived_from_nodes` (uuid[]) - Knowledge nodes that inspired this
      - `potential_impact` (text) - Impact assessment: low, medium, high, breakthrough
      - `domain` (text) - Domain area
      - `evidence_summary` (text) - AI-generated evidence summary
      - `tags` (text[])
      - `metadata` (jsonb)
      - `is_public` (boolean) - Visibility flag
      - `created_at`, `updated_at` (timestamptz)

    - `innovation_iterations`
      - `id` (uuid, primary key)
      - `innovation_id` (uuid, FK to innovations)
      - `user_id` (uuid, FK to auth.users)
      - `iteration_number` (int) - Sequential iteration count
      - `changes_description` (text) - What changed in this iteration
      - `ai_evaluation` (text) - AI evaluation of the change
      - `ai_score` (numeric) - AI quality score 0-100
      - `snapshot_data` (jsonb) - Full snapshot of innovation state
      - `created_at` (timestamptz)

    - `knowledge_collections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `title` (text) - Collection name
      - `description` (text) - What this collection is about
      - `collection_type` (text) - Type: research_topic, project, reading_list, curriculum
      - `is_public` (boolean)
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)

    - `collection_items`
      - `id` (uuid, primary key)
      - `collection_id` (uuid, FK to knowledge_collections)
      - `item_type` (text) - Type: knowledge_node, innovation, paper, external_url
      - `item_id` (uuid, nullable) - Reference to the item
      - `external_url` (text) - For external items
      - `notes` (text) - User notes about this item
      - `sort_order` (int)
      - `added_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Users can CRUD their own data
    - Public items visible to all authenticated users
    - Admins have full access

  3. Indexes
    - Full-text search indexes on title/content
    - Tag array indexes with GIN
    - Composite indexes for common query patterns
*/

-- Knowledge Nodes: Core units of extracted knowledge
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  node_type text NOT NULL DEFAULT 'concept',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  source_paper_id uuid REFERENCES paper_submissions(id),
  source_url text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT 'general',
  confidence_score numeric NOT NULL DEFAULT 0,
  ai_model_used text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  language text NOT NULL DEFAULT 'en',
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own knowledge nodes"
  ON knowledge_nodes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all knowledge nodes"
  ON knowledge_nodes FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own knowledge nodes"
  ON knowledge_nodes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own knowledge nodes"
  ON knowledge_nodes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own knowledge nodes"
  ON knowledge_nodes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Knowledge Edges: Relationships between nodes (knowledge graph)
CREATE TABLE IF NOT EXISTS knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL REFERENCES knowledge_nodes(id),
  target_node_id uuid NOT NULL REFERENCES knowledge_nodes(id),
  relationship_type text NOT NULL DEFAULT 'related',
  strength numeric NOT NULL DEFAULT 0.5,
  ai_generated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_loop CHECK (source_node_id != target_node_id)
);

ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read edges for own nodes"
  ON knowledge_edges FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can read all edges"
  ON knowledge_edges FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert edges"
  ON knowledge_edges FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own edges"
  ON knowledge_edges FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own edges"
  ON knowledge_edges FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Innovations: New ideas derived from knowledge
CREATE TABLE IF NOT EXISTS innovations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  innovation_type text NOT NULL DEFAULT 'hypothesis',
  status text NOT NULL DEFAULT 'draft',
  derived_from_nodes uuid[] NOT NULL DEFAULT '{}',
  potential_impact text NOT NULL DEFAULT 'medium',
  domain text NOT NULL DEFAULT 'general',
  evidence_summary text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE innovations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own innovations"
  ON innovations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can read public innovations"
  ON innovations FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can read all innovations"
  ON innovations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own innovations"
  ON innovations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own innovations"
  ON innovations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own innovations"
  ON innovations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Innovation Iterations: Track evolution of ideas
CREATE TABLE IF NOT EXISTS innovation_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovation_id uuid NOT NULL REFERENCES innovations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  iteration_number int NOT NULL DEFAULT 1,
  changes_description text NOT NULL DEFAULT '',
  ai_evaluation text NOT NULL DEFAULT '',
  ai_score numeric NOT NULL DEFAULT 0,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE innovation_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own iteration history"
  ON innovation_iterations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all iterations"
  ON innovation_iterations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can insert own iterations"
  ON innovation_iterations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Knowledge Collections: Organized groups of knowledge
CREATE TABLE IF NOT EXISTS knowledge_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  collection_type text NOT NULL DEFAULT 'research_topic',
  is_public boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own collections"
  ON knowledge_collections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can read public collections"
  ON knowledge_collections FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can insert own collections"
  ON knowledge_collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collections"
  ON knowledge_collections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own collections"
  ON knowledge_collections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Collection Items: Items within collections
CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES knowledge_collections(id),
  item_type text NOT NULL DEFAULT 'knowledge_node',
  item_id uuid,
  external_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read items in own collections"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_collections
      WHERE knowledge_collections.id = collection_items.collection_id
      AND knowledge_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read items in public collections"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_collections
      WHERE knowledge_collections.id = collection_items.collection_id
      AND knowledge_collections.is_public = true
    )
  );

CREATE POLICY "Users can insert items to own collections"
  ON collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_collections
      WHERE knowledge_collections.id = collection_items.collection_id
      AND knowledge_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own collections"
  ON collection_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_collections
      WHERE knowledge_collections.id = collection_items.collection_id
      AND knowledge_collections.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_collections
      WHERE knowledge_collections.id = collection_items.collection_id
      AND knowledge_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own collections"
  ON collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_collections
      WHERE knowledge_collections.id = collection_items.collection_id
      AND knowledge_collections.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user ON knowledge_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_domain ON knowledge_nodes(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_source ON knowledge_nodes(source_paper_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_tags ON knowledge_nodes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_verified ON knowledge_nodes(is_verified);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_created ON knowledge_nodes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON knowledge_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON knowledge_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_type ON knowledge_edges(relationship_type);

CREATE INDEX IF NOT EXISTS idx_innovations_user ON innovations(user_id);
CREATE INDEX IF NOT EXISTS idx_innovations_status ON innovations(status);
CREATE INDEX IF NOT EXISTS idx_innovations_type ON innovations(innovation_type);
CREATE INDEX IF NOT EXISTS idx_innovations_domain ON innovations(domain);
CREATE INDEX IF NOT EXISTS idx_innovations_tags ON innovations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_innovations_public ON innovations(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_innovation_iterations_innovation ON innovation_iterations(innovation_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_collections_user ON knowledge_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_collections_public ON knowledge_collections(is_public) WHERE is_public = true;
