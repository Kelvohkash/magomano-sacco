ALTER TABLE members ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN second_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN county TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN sub_county TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_two_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_two_branch TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_two_account_name TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN bank_two_account_number TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS member_terms_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  terms_content TEXT NOT NULL,
  terms_updated_at TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS member_contacts_limit_insert
BEFORE INSERT ON member_contacts
WHEN (SELECT COUNT(*) FROM member_contacts WHERE member_id = NEW.member_id) >= 2
BEGIN
  SELECT RAISE(ABORT, 'A member can have no more than two contacts.');
END;
