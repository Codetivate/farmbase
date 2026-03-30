-- Migration: add_v_unified_research_papers
-- Description: Creates a unified view of research papers combining paper_submissions, research_citations, and crops.

CREATE OR REPLACE VIEW v_unified_research_papers AS
SELECT 
    ps.id AS submission_id,
    rc.id AS citation_id,
    c.id AS crop_id,
    c.name AS crop_name,
    c.category AS crop_category,
    COALESCE(rc.title, ps.title) AS title,
    COALESCE(rc.authors, ps.authors) AS authors,
    COALESCE(rc.year, ps.year) AS publication_year,
    COALESCE(rc.journal, ps.journal) AS journal,
    COALESCE(rc.doi, ps.doi) AS doi,
    ps.url,
    ps.abstract_text,
    COALESCE(rc.summary, ps.ai_summary) AS summary,
    COALESCE(rc.confidence_score, ps.ai_confidence_score) AS confidence_score,
    ps.ai_relevance_tags AS tags,
    ps.status AS processing_status,
    COALESCE(rc.created_at, ps.created_at) AS added_at
FROM 
    paper_submissions ps
LEFT JOIN 
    research_citations rc ON rc.submission_id = ps.id
LEFT JOIN 
    crops c ON c.id = ps.crop_id;

-- Ensure that the unified view is accessible to authenticated users
GRANT SELECT ON v_unified_research_papers TO anon, authenticated;
