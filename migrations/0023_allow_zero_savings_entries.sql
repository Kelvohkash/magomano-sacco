CREATE TABLE savings_transactions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'withdrawal')),
  amount REAL NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO savings_transactions_new (id, member_id, entry_type, amount, description, occurred_at)
SELECT id, member_id, entry_type, amount, description, occurred_at
FROM savings_transactions;

DROP TABLE savings_transactions;
ALTER TABLE savings_transactions_new RENAME TO savings_transactions;

CREATE INDEX savings_transactions_member_date
  ON savings_transactions(member_id, occurred_at DESC);
