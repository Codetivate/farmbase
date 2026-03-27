/*
  # Add Training Uploads and Bulk Operations Support

  1. New Tables
    - `training_uploads`
      - `id` (uuid, primary key)
      - `filename` (text) - Original name of uploaded file
      - `file_type` (text) - MIME type of the file
      - `file_size_bytes` (bigint) - Size in bytes
      - `storage_path` (text) - Path in Supabase storage
      - `uploaded_by_email` (text) - Who uploaded it
      - `crop_id` (uuid, nullable) - Optional crop association
      - `purpose` (text) - What the upload is for: training, reference, dataset
      - `processing_status` (text) - pending, processing, completed, failed
      - `ai_extracted_text` (text) - Text extracted by AI
      - `ai_summary` (text) - AI-generated summary of the document
      - `ai_tags` (text[]) - Auto-generated tags
      - `ai_confidence` (numeric) - Confidence in extraction
      - `ai_model_used` (text) - Which model processed it
      - `ai_processed_at` (timestamptz) - When AI processed it
      - `privacy_level` (text) - public, internal, confidential, restricted
      - `retention_days` (integer) - Auto-delete after N days (0 = permanent)
      - `is_redacted` (boolean) - Whether PII has been redacted
      - `error_message` (text) - Error details if processing failed
      - `metadata` (jsonb) - Flexible metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Columns on existing tables
    - `paper_submissions.priority` (text) - low, normal, high, urgent
    - `paper_submissions.assigned_to_email` (text) - Assigned reviewer
    - `paper_submissions.batch_id` (text) - For bulk operations grouping

  3. Security
    - Enable RLS on `training_uploads`
    - Policies for authenticated insert/select
    - Index on processing_status, privacy_level, crop_id

  4. Important Notes
    - Privacy levels control who can see documents
    - Retention policy enables auto-cleanup
    - batch_id enables bulk operations on submissions
*/

-- training_uploads table
CREATE TABLE IF NOT EXISTS training_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL DEFAULT '',
  uploaded_by_email text NOT NULL DEFAULT '',
  crop_id uuid REFERENCES crops(id),
  purpose text NOT NULL DEFAULT 'reference',
  processing_status text NOT NULL DEFAULT 'pending',
  ai_extracted_text text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  ai_tags text[] NOT NULL DEFAULT '{}',
  ai_confidence numeric NOT NULL DEFAULT 0,
  ai_model_used text NOT NULL DEFAULT '',
  ai_processed_at timestamptz,
  privacy_level text NOT NULL DEFAULT 'internal',
  retention_days integer NOT NULL DEFAULT 0,
  is_redacted boolean NOT NULL DEFAULT false,
  error_message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert training uploads"
  ON training_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view non-restricted uploads"
  ON training_uploads
  FOR SELECT
  TO authenticated
  USING (privacy_level != 'restricted');

CREATE POLICY "Anon users can insert training uploads"
  ON training_uploads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can view public uploads"
  ON training_uploads
  FOR SELECT
  TO anon
  USING (privacy_level = 'public' OR privacy_level = 'internal');

-- Indexes for training_uploads
CREATE INDEX IF NOT EXISTS idx_training_uploads_status ON training_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_training_uploads_privacy ON training_uploads(privacy_level);
CREATE INDEX IF NOT EXISTS idx_training_uploads_crop ON training_uploads(crop_id);
CREATE INDEX IF NOT EXISTS idx_training_uploads_purpose ON training_uploads(purpose);
CREATE INDEX IF NOT EXISTS idx_training_uploads_created ON training_uploads(created_at DESC);

-- Add columns to paper_submissions for bulk ops and assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paper_submissions' AND column_name = 'priority'
  ) THEN
    ALTER TABLE paper_submissions ADD COLUMN priority text NOT NULL DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paper_submissions' AND column_name = 'assigned_to_email'
  ) THEN
    ALTER TABLE paper_submissions ADD COLUMN assigned_to_email text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paper_submissions' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE paper_submissions ADD COLUMN batch_id text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Index for bulk operations
CREATE INDEX IF NOT EXISTS idx_paper_submissions_batch ON paper_submissions(batch_id);
CREATE INDEX IF NOT EXISTS idx_paper_submissions_priority ON paper_submissions(priority);
CREATE INDEX IF NOT EXISTS idx_paper_submissions_assigned ON paper_submissions(assigned_to_email);
