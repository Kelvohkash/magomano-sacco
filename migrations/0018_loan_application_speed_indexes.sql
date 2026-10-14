-- Index to optimize member loan application status queries and filtering
CREATE INDEX IF NOT EXISTS loan_applications_member_status_date
  ON loan_applications(member_id, status, applied_at DESC);
