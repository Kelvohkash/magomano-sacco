DROP INDEX members_national_id_unique;

CREATE UNIQUE INDEX members_national_id_unique
  ON members(national_id COLLATE NOCASE)
  WHERE national_id <> '';

CREATE TABLE member_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_hash TEXT NOT NULL UNIQUE,
  imported_rows INTEGER NOT NULL,
  imported_by INTEGER NOT NULL REFERENCES admins(id),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
