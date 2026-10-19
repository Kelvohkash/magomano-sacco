ALTER TABLE member_loans
  ADD COLUMN legacy_imported INTEGER NOT NULL DEFAULT 0
  CHECK (legacy_imported IN (0, 1));
