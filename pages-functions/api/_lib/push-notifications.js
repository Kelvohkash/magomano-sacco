import { json, readJson, ApiError } from './shared.js'

// VAPID JWT construction for Cloudflare Workers runtime
async function buildVapidJwt(vapidPrivateKeyB64, audience, subject) {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600
  const payload = btoa(JSON.stringify({ aud: audience, exp, sub: subject }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${header}.${payload}`
  const keyBytes = Uint8Array.from(
    atob(vapidPrivateKeyB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  )
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, new TextEncoder().encode(signingInput),
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${signingInput}.${sigB64}`
}

async function sendPushToEndpoint(endpoint, keysJson, payload, vapidPublicKey, vapidPrivateKey, vapidSubject) {
  try {
    const jwt = await buildVapidJwt(vapidPrivateKey, new URL(endpoint).origin, vapidSubject)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Type': 'application/json',
        TTL: '86400',
      },
      body: JSON.stringify(payload),
    })
    return response.status
  } catch {
    return 0
  }
}

export async function handleMemberPushSubscribe(request, session, env) {
  if (request.method !== 'POST') return null
  const body = await readJson(request)
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
  const keys = body.keys && typeof body.keys === 'object' ? body.keys : null
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new ApiError('Invalid push subscription data.')
  }
  await env.DB.prepare(`
    INSERT INTO push_subscriptions (member_id, endpoint, keys_json)
    VALUES (?, ?, ?)
    ON CONFLICT(member_id, endpoint) DO UPDATE SET keys_json = excluded.keys_json
  `).bind(session.memberId, endpoint, JSON.stringify(keys)).run()
  return json({ message: 'Push subscription saved.' })
}

export async function handleAdminNotifications(path, request, session, env) {
  if (!path.startsWith('/admin/notifications')) return null

  if (path === '/admin/notifications' && request.method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT n.id, n.title, n.body, n.target_type AS targetType,
        n.target_member_id AS targetMemberId, m.full_name AS targetMemberName,
        n.created_at AS createdAt, n.sent_count AS sentCount
      FROM admin_notifications n LEFT JOIN members m ON m.id = n.target_member_id
      ORDER BY n.created_at DESC LIMIT 50
    `).all()
    return json({ notifications: rows.results })
  }

  if (path === '/admin/notifications' && request.method === 'POST') {
    const body = await readJson(request)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const notifBody = typeof body.body === 'string' ? body.body.trim() : ''
    const targetType = body.targetType === 'member' ? 'member' : 'all'
    const targetMemberId = targetType === 'member' && Number.isInteger(Number(body.targetMemberId)) && body.targetMemberId ? Number(body.targetMemberId) : null
    if (!title || title.length > 120) throw new ApiError('Title is required (max 120 characters).')
    if (!notifBody || notifBody.length > 500) throw new ApiError('Body is required (max 500 characters).')
    if (targetType === 'member' && !targetMemberId) throw new ApiError('Select a target member.')

    let subscriptions
    if (targetType === 'all') {
      subscriptions = await env.DB.prepare('SELECT endpoint, keys_json AS keysJson FROM push_subscriptions').all()
    } else {
      subscriptions = await env.DB.prepare('SELECT endpoint, keys_json AS keysJson FROM push_subscriptions WHERE member_id=?').bind(targetMemberId).all()
    }

    const result = await env.DB.prepare(`
      INSERT INTO admin_notifications (title, body, target_type, target_member_id, sent_count)
      VALUES (?, ?, ?, ?, ?)
    `).bind(title, notifBody, targetType, targetMemberId, subscriptions.results.length).run()

    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT && subscriptions.results.length > 0) {
      const payload = { title, body: notifBody, notificationId: result.meta.last_row_id }
      await Promise.allSettled(
        subscriptions.results.map((sub) =>
          sendPushToEndpoint(sub.endpoint, sub.keysJson, payload, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT),
        ),
      )
    }

    return json({ message: `Notification sent to ${subscriptions.results.length} device(s).` }, 201)
  }

  return null
}

// Send a system push notification to a specific member (for automated events)
export async function sendSystemPush(memberId, title, body, env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return
  const subscriptions = await env.DB.prepare('SELECT endpoint, keys_json AS keysJson FROM push_subscriptions WHERE member_id=?').bind(memberId).all()
  if (!subscriptions.results.length) return
  const payload = { title, body }
  await Promise.allSettled(
    subscriptions.results.map((sub) =>
      sendPushToEndpoint(sub.endpoint, sub.keysJson, payload, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT),
    ),
  )
}
