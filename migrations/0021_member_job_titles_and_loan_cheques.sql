ALTER TABLE members
  ADD COLUMN job_title TEXT NOT NULL DEFAULT '';

ALTER TABLE loan_applications
  ADD COLUMN cheque_number TEXT;
