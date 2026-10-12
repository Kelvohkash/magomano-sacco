import { json } from './_lib/shared.js'
import { handleAuth } from './_lib/auth.js'
import { handleMember } from './_lib/member.js'
import { handleAdmin } from './_lib/admin.js'

export async function onRequest(context) {
  try {
    const { request, env } = context
    if (!env.DB) throw new Error('The D1 binding "DB" is not configured.')
    if (!new URL(request.url).pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404)
    const paramPath = context.params.path ?? ''
    const path = `/${Array.isArray(paramPath) ? paramPath.join('/') : paramPath}`
    const result = await handleAuth(path, request, env)
      ?? await handleMember(path, request, env)
      ?? await handleAdmin(path, request, env)
    return result ?? json({ error: 'Not found.' }, 404)
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') return json({ error: error.message }, error.status)
    console.error('API request failed:', error)
    return json({ error: 'An unexpected server error occurred.' }, 500)
  }
}
