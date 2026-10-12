import { randomBytes, scryptSync } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const username = process.env.ADMIN_USERNAME?.trim() ?? ''
const password = process.env.ADMIN_PASSWORD ?? ''
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'SACCO Administrator'

if (!username || username.length > 100 || !password || displayName.length > 100) {
  console.error('Set ADMIN_USERNAME (1-100 chars), ADMIN_PASSWORD, and optionally ADMIN_DISPLAY_NAME (up to 100 chars).')
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
const passwordHash = scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex')
const quote = (value) => `'${value.replaceAll("'", "''")}'`
const sql = `
  INSERT INTO admins (username, display_name, password_salt, password_hash)
  VALUES (${quote(username)}, ${quote(displayName)}, '${salt}', '${passwordHash}')
  ON CONFLICT(username) DO UPDATE SET
    display_name = excluded.display_name,
    password_salt = excluded.password_salt,
    password_hash = excluded.password_hash;
`
const mode = process.env.ADMIN_D1_LOCAL === '1' ? '--local' : '--remote'
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const result = spawnSync(process.execPath, [
  wrangler, 'd1', 'execute', 'magomano-db', mode, '--command', sql,
], { stdio: 'inherit' })

if (result.error) {
  console.error('Could not run Wrangler:', result.error.message)
  process.exit(1)
}
if (result.status !== 0) process.exit(result.status ?? 1)
console.log(`Administrator "${username}" is ready in ${mode === '--remote' ? 'remote' : 'local'} D1.`)
