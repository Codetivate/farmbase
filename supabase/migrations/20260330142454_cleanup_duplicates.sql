-- Migration: cleanup_duplicates
-- Description: Removes duplicate entries and fixes foreign keys reliably

-- 1. Identify the 'master' (oldest by created_at) paper_submissions for each DOI
WITH RankedSubs AS (
  SELECT id, doi, ROW_NUMBER() OVER(PARTITION BY doi ORDER BY created_at ASC) as rk
  FROM paper_submissions
  WHERE doi IS NOT NULL AND doi != ''
)
UPDATE research_citations rc
SET submission_id = rs.id
FROM paper_submissions ps
JOIN RankedSubs rs ON rs.doi = ps.doi AND rs.rk = 1
WHERE rc.submission_id = ps.id AND rc.submission_id != rs.id;

-- 2. Delete duplicate paper_submissions (keep the oldest one)
DELETE FROM paper_submissions a USING paper_submissions b
WHERE a.created_at > b.created_at 
  AND a.doi = b.doi 
  AND a.doi IS NOT NULL AND a.doi != '';

-- 3. Delete duplicate research_citations (keep the oldest one per crop_id and doi)
DELETE FROM research_citations a USING research_citations b
WHERE a.created_at > b.created_at 
  AND a.doi = b.doi 
  AND a.doi IS NOT NULL AND a.doi != ''
  AND a.crop_id = b.crop_id;
