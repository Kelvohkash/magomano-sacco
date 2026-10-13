CREATE TABLE IF NOT EXISTS imported_transaction_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_type TEXT NOT NULL CHECK (import_type IN ('savings', 'repayments')),
  row_hash TEXT NOT NULL UNIQUE,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
