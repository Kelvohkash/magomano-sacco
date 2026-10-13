CREATE TABLE unallocated_loan_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  amount REAL NOT NULL CHECK (amount > 0),
  remaining_amount REAL NOT NULL CHECK (remaining_amount >= 0),
  description TEXT NOT NULL DEFAULT 'Loan repayment',
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX unallocated_loan_payments_member_date
  ON unallocated_loan_payments(member_id, paid_at, id);

CREATE TABLE combined_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_hash TEXT NOT NULL UNIQUE,
  imported_rows INTEGER NOT NULL,
  imported_by INTEGER NOT NULL REFERENCES admins(id),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
