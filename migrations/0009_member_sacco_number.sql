ALTER TABLE members ADD COLUMN sacco_number TEXT;

CREATE UNIQUE INDEX members_sacco_number_unique
  ON members(sacco_number COLLATE NOCASE)
  WHERE sacco_number IS NOT NULL;
