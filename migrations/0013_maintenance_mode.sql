CREATE TABLE IF NOT EXISTS maintenance_mode (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  message TEXT NOT NULL DEFAULT 'We are carrying out maintenance. Please try again later.',
  updated_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO maintenance_mode (id, enabled, message)
VALUES (1, 0, 'We are carrying out maintenance. Please try again later.');
