import { requireRole } from './shared.js'
import { handleAdminOverview } from './admin-overview.js'
import { handleAdminCharges } from './admin-charges.js'
import { handleAdminMembers } from './admin-members.js'
import { handleAdminLoans } from './admin-loans.js'
import { handleAdminFinances } from './admin-finances.js'
import { importRows } from './admin-imports.js'

export async function handleAdmin(path, request, env) {
  if (!path.startsWith('/admin/')) return null
  const session = await requireRole(request, env, 'admin')
  const db = env.DB

  const result = await handleAdminOverview(path, request, session, db)
    ?? await handleAdminCharges(path, request, session, db)
    ?? await handleAdminMembers(path, request, session, db)
    ?? await handleAdminLoans(path, request, session, db)
    ?? await handleAdminFinances(path, request, session, db)
  if (result) return result

  const importMatch = path.match(/^\/admin\/imports\/(members|savings|repayments)$/)
  if (importMatch && request.method === 'POST') {
    return importRows(request, session, db, importMatch[1])
  }
  return null
}
