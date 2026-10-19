import { ApiError, requireRole } from './shared.js'
import { memberDashboard, memberTransactions } from './member-dashboard.js'
import { handleMemberLoans } from './member-loans.js'
import { handleMemberAccount } from './member-account.js'
import { handleMemberPushSubscribe } from './push-notifications.js'

export async function handleMember(path, request, env) {
  const isContactDelete = /^\/member\/contacts\/\d+$/.test(path) && request.method === 'DELETE'
  if (path !== '/member/dashboard' && path !== '/member/loan-applications'
    && path !== '/member/transactions' && path !== '/member/contacts'
    && path !== '/member/profile' && path !== '/member/profile/pending'
    && path !== '/member/password' && path !== '/member/terms'
    && path !== '/member/push-subscribe' && !isContactDelete) return null

  const session = await requireRole(request, env, 'member')
  if (request.method !== 'GET') {
    const maintenance = await env.DB.prepare('SELECT enabled, message FROM maintenance_mode WHERE id = 1').first()
    if (maintenance?.enabled) {
      throw new ApiError(maintenance.message || 'Member services are temporarily unavailable during maintenance.', 503)
    }
  }
  if (path === '/member/dashboard' && request.method === 'GET') return memberDashboard(session, env)
  if (path === '/member/transactions' && request.method === 'GET') return memberTransactions(request, session, env)
  if (path === '/member/push-subscribe') return handleMemberPushSubscribe(request, session, env)
  return await handleMemberLoans(path, request, session, env)
    ?? await handleMemberAccount(path, request, session, env)
}
