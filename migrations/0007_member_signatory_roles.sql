ALTER TABLE members
  ADD COLUMN member_role TEXT NOT NULL DEFAULT 'member'
  CHECK (member_role IN ('member', 'signatory'));
