ALTER TABLE members ADD COLUMN bank_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_branch TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_account_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_account_number TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN location TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN marital_status TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN next_kin_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN next_kin_relationship TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN next_kin_phone TEXT NOT NULL DEFAULT '';

ALTER TABLE loan_applications
  ADD COLUMN security_type TEXT NOT NULL DEFAULT 'savings'
  CHECK (security_type = 'savings');

ALTER TABLE member_loans
  ADD COLUMN security_type TEXT NOT NULL DEFAULT 'savings'
  CHECK (security_type = 'savings');

CREATE TABLE IF NOT EXISTS member_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS member_contacts_member_created
  ON member_contacts(member_id, created_at, id);

CREATE TABLE IF NOT EXISTS sacco_terms (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT NOT NULL DEFAULT '',
  updated_by INTEGER REFERENCES admins(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO sacco_terms (id, content) VALUES (1, '');
