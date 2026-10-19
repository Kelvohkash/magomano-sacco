-- Migration 0025: Add pending_profile_changes table
CREATE TABLE IF NOT EXISTS pending_profile_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  changes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by_admin_id INTEGER REFERENCES admins(id),
  admin_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_profile_changes_member ON pending_profile_changes(member_id);
CREATE INDEX IF NOT EXISTS idx_pending_profile_changes_status ON pending_profile_changes(status);
