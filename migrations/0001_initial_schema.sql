CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  national_id TEXT NOT NULL COLLATE NOCASE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  account_status TEXT NOT NULL DEFAULT 'pending',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS members_national_id_unique
  ON members(national_id COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  CHECK (
    (role = 'member' AND member_id IS NOT NULL AND admin_id IS NULL)
    OR (role = 'admin' AND admin_id IS NOT NULL AND member_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS savings_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'withdrawal')),
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  loan_reference TEXT NOT NULL UNIQUE,
  principal_amount REAL NOT NULL CHECK (principal_amount > 0),
  interest_rate REAL NOT NULL DEFAULT 10 CHECK (interest_rate >= 0),
  repayment_months INTEGER NOT NULL DEFAULT 1 CHECK (repayment_months > 0),
  total_repayable REAL NOT NULL DEFAULT 0 CHECK (total_repayable >= 0),
  outstanding_balance REAL NOT NULL DEFAULT 0 CHECK (outstanding_balance >= 0),
  status TEXT NOT NULL,
  issued_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  requested_amount REAL NOT NULL CHECK (requested_amount > 0),
  repayment_months INTEGER NOT NULL DEFAULT 1 CHECK (repayment_months > 0),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dividend_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  financial_period TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL REFERENCES member_loans(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bulk_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_type TEXT NOT NULL CHECK (import_type IN ('savings', 'repayments')),
  content_hash TEXT NOT NULL UNIQUE,
  imported_rows INTEGER NOT NULL,
  imported_by INTEGER NOT NULL REFERENCES admins(id),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS savings_transactions_member_date
  ON savings_transactions(member_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS member_loans_member_date
  ON member_loans(member_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS loan_applications_member_date
  ON loan_applications(member_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS dividend_payments_member_date
  ON dividend_payments(member_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS loan_repayments_loan_date
  ON loan_repayments(loan_id, paid_at DESC);
