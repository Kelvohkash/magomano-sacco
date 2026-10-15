CREATE TABLE IF NOT EXISTS admin_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 160),
  amount REAL NOT NULL CHECK (amount > 0),
  target_type TEXT NOT NULL CHECK (target_type IN ('individual', 'group', 'all')),
  created_by INTEGER NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_charge_applications (
  charge_id INTEGER NOT NULL REFERENCES admin_charges(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL CHECK (status IN ('applied', 'insufficient_savings')),
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (charge_id, member_id)
);

CREATE INDEX IF NOT EXISTS admin_charge_applications_member
  ON admin_charge_applications(member_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS admin_charges_created
  ON admin_charges(created_at DESC, id DESC);
