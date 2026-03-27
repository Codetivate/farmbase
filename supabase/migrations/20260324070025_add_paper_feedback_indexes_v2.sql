/*
  # Create Paper Feedback Table and Indexes
  
  The table was missing from previous migrations. This script creates the table
  alongside the performance indexes.
*/

CREATE TABLE IF NOT EXISTS paper_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES paper_submissions(id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  field_name text NOT NULL,
  original_value text NOT NULL,
  suggested_value text NOT NULL,
  feedback_notes text NOT NULL,
  reporter_email text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  ai_analysis text NOT NULL DEFAULT '',
  ai_recommendation text NOT NULL DEFAULT '',
  ai_confidence numeric NOT NULL DEFAULT 0,
  ai_processed_at timestamptz,
  resolved_by_email text NOT NULL DEFAULT '',
  resolution_notes text NOT NULL DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paper_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read paper_feedback" ON paper_feedback FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert paper_feedback" ON paper_feedback FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paper_feedback_submission_id ON paper_feedback(submission_id);
CREATE INDEX IF NOT EXISTS idx_paper_feedback_status ON paper_feedback(status);
CREATE INDEX IF NOT EXISTS idx_paper_feedback_severity ON paper_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_paper_feedback_ai_confidence ON paper_feedback(ai_confidence DESC);
