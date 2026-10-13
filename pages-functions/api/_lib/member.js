import { requireRole } from './shared.js'
import { memberDashboard, memberTransactions } from './member-dashboard.js'
import { handleMemberLoans } from './member-loans.js'
import { handleMemberAccount } from './member-account.js'

export async function handleMember(path, request, env) {
  const isContactDelete = /^\/member\/contacts\/\d+$/.test(path) && request.method === 'DELETE'
  if (path !== '/member/dashboard' && path !== '/member/loan-applications'
    && path !== '/member/transactions' && path !== '/member/contacts'
    && path !== '/member/profile' && path !== '/member/password'
    && path !== '/member/terms' && !isContactDelete) return null

  const session = await requireRole(request, env, 'member')
  if (path === '/member/dashboard' && request.method === 'GET') return memberDashboard(session, env)
  if (path === '/member/transactions' && request.method === 'GET') return memberTransactions(request, session, env)
  return await handleMemberLoans(path, request, session, env)
    ?? await handleMemberAccount(path, request, session, env)
}
