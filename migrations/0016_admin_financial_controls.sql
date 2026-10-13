ALTER TABLE loan_applications ADD COLUMN security_hash TEXT NOT NULL DEFAULT '';

CREATE TABLE member_popup_message_recipients (
  message_id INTEGER NOT NULL REFERENCES member_popup_messages(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, member_id)
);
INSERT OR IGNORE INTO member_popup_message_recipients (message_id, member_id)
SELECT id, target_member_id FROM member_popup_messages
WHERE target_type = 'member' AND target_member_id IS NOT NULL;

CREATE TABLE interest_disbursements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member_terminations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id),
  savings_applied REAL NOT NULL DEFAULT 0,
  loan_balance_settled REAL NOT NULL DEFAULT 0,
  payout_amount REAL NOT NULL DEFAULT 0,
  remaining_loan_due REAL NOT NULL DEFAULT 0,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  settled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
