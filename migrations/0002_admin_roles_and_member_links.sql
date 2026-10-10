ALTER TABLE admins
  ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'superadmin'));

ALTER TABLE admins
  ADD COLUMN member_id INTEGER REFERENCES members(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS admins_member_id_unique
  ON admins(member_id)
  WHERE member_id IS NOT NULL;
