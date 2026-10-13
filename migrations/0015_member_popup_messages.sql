CREATE TABLE IF NOT EXISTS member_popup_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'member')),
  target_member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by INTEGER NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((target_type = 'all' AND target_member_id IS NULL) OR (target_type = 'member' AND target_member_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS member_popup_messages_active_target
  ON member_popup_messages(active, target_type, target_member_id, created_at DESC);
