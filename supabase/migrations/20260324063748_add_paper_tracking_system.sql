/*
  # Paper Tracking & AI Analysis System

  1. New Tables
    - `paper_submissions`
      - `id` (uuid, primary key)
      - `doi` (text) - Digital Object Identifier of the paper
      - `url` (text) - Direct URL to the paper if DOI unavailable
      - `crop_id` (uuid, FK to crops) - Which crop this paper relates to
      - `submitted_by_email` (text) - Email of team member who submitted
      - `title` (text) - Paper title (from CrossRef or manual)
      - `authors` (text) - Author list
      - `year` (int) - Publication year
      - `journal` (text) - Journal name
      - `abstract_text` (text) - Original abstract from CrossRef
      - `ai_summary` (text) - AI-generated summary of the paper
      - `ai_confidence_score` (numeric) - AI confidence score 0-100
      - `ai_relevance_tags` (text[]) - AI-extracted tags about what the paper covers
      - `ai_model_used` (text) - Which AI model generated the summary
      - `status` (text) - Pipeline status: pending, analyzing, review, approved, rejected, error
      - `error_message` (text) - Error details if processing fails
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `paper_reviews`
      - `id` (uuid, primary key)
      - `submission_id` (uuid, FK to paper_submissions)
      - `reviewer_email` (text) - Email of the reviewer
      - `decision` (text) - approved, rejected, needs_revision
      - `reviewer_notes` (text) - Reviewer comments explaining decision
      - `confidence_adjustment` (int) - Manual adjustment to AI confidence (-20 to +20)
      - `data_accuracy` (text) - Rating: accurate, minor_issues, major_issues
      - `reviewed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `paper_audit_log`
      - `id` (uuid, primary key)
      - `submission_id` (uuid, FK to paper_submissions)
      - `action` (text) - submitted, analyzing, analyzed, review_requested, approved, rejected, promoted, error
      - `actor_email` (text) - Who performed the action
      - `details` (jsonb) - Additional context
      - `created_at` (timestamptz)

  2. Modified Tables
    - `research_citations` - Add `submission_id` FK to link approved papers back

  3. Security
    - Enable RLS on all new tables
    - Anon + authenticated can read paper_submissions and paper_audit_log (team transparency)
    - Authenticated can insert submissions and reviews
    - Only authenticated can update submission status

  4. Notes
    - The pipeline flow is: submitted -> analyzing -> review -> approved/rejected
    - Approved papers get promoted to research_citations for display
    - Audit log tracks every state change for team accountability
*/

-- Paper Submissions table
CREATE TABLE IF NOT EXISTS paper_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doi text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  crop_id uuid NOT NULL REFERENCES crops(id),
  submitted_by_email text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  authors text NOT NULL DEFAULT '',
  year int NOT NULL DEFAULT 2024,
  journal text NOT NULL DEFAULT '',
  abstract_text text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  ai_confidence_score numeric NOT NULL DEFAULT 0,
  ai_relevance_tags text[] NOT NULL DEFAULT '{}',
  ai_model_used text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paper_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read paper submissions"
  ON paper_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert paper submissions"
  ON paper_submissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update paper submissions"
  ON paper_submissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Paper Reviews table
CREATE TABLE IF NOT EXISTS paper_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES paper_submissions(id),
  reviewer_email text NOT NULL DEFAULT '',
  decision text NOT NULL DEFAULT 'pending',
  reviewer_notes text NOT NULL DEFAULT '',
  confidence_adjustment int NOT NULL DEFAULT 0,
  data_accuracy text NOT NULL DEFAULT 'accurate',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paper_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read paper reviews"
  ON paper_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert paper reviews"
  ON paper_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Paper Audit Log table
CREATE TABLE IF NOT EXISTS paper_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES paper_submissions(id),
  action text NOT NULL,
  actor_email text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paper_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audit log"
  ON paper_audit_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit log"
  ON paper_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add submission_id to research_citations to link approved papers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_citations' AND column_name = 'submission_id'
  ) THEN
    ALTER TABLE research_citations ADD COLUMN submission_id uuid REFERENCES paper_submissions(id);
  END IF;
END $$;

-- Index for frequent queries
CREATE INDEX IF NOT EXISTS idx_paper_submissions_crop_id ON paper_submissions(crop_id);
CREATE INDEX IF NOT EXISTS idx_paper_submissions_status ON paper_submissions(status);
CREATE INDEX IF NOT EXISTS idx_paper_submissions_doi ON paper_submissions(doi);
CREATE INDEX IF NOT EXISTS idx_paper_reviews_submission_id ON paper_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_paper_audit_log_submission_id ON paper_audit_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_research_citations_submission_id ON research_citations(submission_id);
