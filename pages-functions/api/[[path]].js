import { currentSession, json } from './_lib/shared.js'
import { handleAuth } from './_lib/auth.js'
import { handleMember } from './_lib/member.js'
import { handleAdmin } from './_lib/admin.js'

function addCapacitorCors(response, request) {
  const origin = request.headers.get('Origin')
  if (origin !== 'https://localhost') return response
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export async function onRequest(context) {
  const { request } = context
  if (request.method === 'OPTIONS' && request.headers.get('Origin') === 'https://localhost') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://localhost',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    })
  }
  try {
    const { env } = context
    if (!env.DB) throw new Error('The D1 binding "DB" is not configured.')
    if (!new URL(request.url).pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404)
    const paramPath = context.params.path ?? ''
    const path = `/${Array.isArray(paramPath) ? paramPath.join('/') : paramPath}`

    // Check the authenticated account revision before serving a conditional GET.
    let etag = null
    if (request.method === 'GET' && (path.startsWith('/member/') || path.startsWith('/admin/'))) {
      const session = await currentSession(request, env)
      if (session?.role === 'member' && path.startsWith('/member/')) {
        const revision = await env.DB.prepare(
          'SELECT revision FROM member_sync_revisions WHERE member_id = ?',
        ).bind(session.memberId).first()
        etag = `"member-${session.memberId}-${revision?.revision ?? 0}"`
      } else if (session?.role === 'admin' && path.startsWith('/admin/')) {
        const revision = await env.DB.prepare('SELECT revision FROM sync_revisions WHERE id = 1').first()
        etag = `"admin-${session.adminId}-${revision?.revision ?? 0}"`
      }

      if (etag && request.headers.get('If-None-Match') === etag) {
        return addCapacitorCors(new Response(null, {
          status: 304,
          headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
        }), request)
      }
    }

    const result = await handleAuth(path, request, env)
      ?? await handleMember(path, request, env)
      ?? await handleAdmin(path, request, env)
    const response = result ?? json({ error: 'Not found.' }, 404)
    if (!etag || !response.ok) return addCapacitorCors(response, request)
    const headers = new Headers(response.headers)
    headers.set('ETag', etag)
    headers.set('Cache-Control', 'private, no-cache')
    return addCapacitorCors(new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }), request)
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      return addCapacitorCors(json({ error: error.message }, error.status), request)
    }
    console.error('API request failed:', error)
    return addCapacitorCors(json({ error: 'An unexpected server error occurred.' }, 500), request)
  }
}
