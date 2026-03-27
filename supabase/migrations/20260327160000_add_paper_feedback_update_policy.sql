/*
  # Add UPDATE and DELETE policies for paper_feedback
  
  The resolve/dismiss functionality in the Issue Tracker requires updating
  paper_feedback rows (setting status to 'resolved' or 'dismissed').
  Previously only SELECT and INSERT policies existed, causing silent failures.
*/

-- Allow anon and authenticated to update paper_feedback (for resolve/dismiss)
CREATE POLICY "Anyone can update paper_feedback"
  ON paper_feedback
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anon and authenticated to delete paper_feedback
CREATE POLICY "Anyone can delete paper_feedback"
  ON paper_feedback
  FOR DELETE
  USING (true);
