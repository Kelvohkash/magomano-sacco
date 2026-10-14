import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'

const databaseName = 'magomano_cache'
const sqlite = new SQLiteConnection(CapacitorSQLite)
let database: SQLiteDBConnection | null = null
let activeScope: string | null = null
let installed = false
const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL || 'https://magomano-sacco.pages.dev'

interface CachedResponse {
  etag: string
  body: string
}

async function getDatabase(): Promise<SQLiteDBConnection> {
  if (database) return database
  if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') {
    throw new Error('SQLite response caching is only enabled in the native app.')
  }

  const secret = await CapacitorSQLite.isSecretStored()
  if (!secret.result) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    const passphrase = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    await CapacitorSQLite.setEncryptionSecret({ passphrase })
  }

  const connection = await sqlite.createConnection(databaseName, true, 'secret', 1, false)
  await connection.open()
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      etag TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  database = connection
  return connection
}

async function readCachedResponse(key: string): Promise<CachedResponse | null> {
  if (!activeScope) return null
  const db = await getDatabase()
  const result = await db.query('SELECT etag, body FROM api_cache WHERE cache_key = ?', [key])
  const row = result.values?.[0]
  return row && typeof row.etag === 'string' && typeof row.body === 'string'
    ? { etag: row.etag, body: row.body }
    : null
}

async function writeCachedResponse(key: string, etag: string, body: string): Promise<void> {
  if (!activeScope) return
  const db = await getDatabase()
  await db.run(`
    INSERT INTO api_cache (cache_key, etag, body, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(cache_key) DO UPDATE SET etag = excluded.etag, body = excluded.body,
      updated_at = CURRENT_TIMESTAMP
  `, [key, etag, body])
}

async function selectScope(scope: string | null): Promise<void> {
  if (scope === activeScope) return
  activeScope = scope
  const db = await getDatabase()
  // Account data is partitioned by the authenticated identity and removed when
  // another account signs in or the current account signs out.
  await db.run('DELETE FROM api_cache')
}

function scopeFromResponse(path: string, response: Response): Promise<void> {
  if (path === '/api/auth/logout') return selectScope(null)
  if (path !== '/api/auth/session' && path !== '/api/auth/login' && path !== '/api/admin/login') {
    return Promise.resolve()
  }

  return response.clone().json().then(async (body: {
    authenticated?: boolean
    cacheScope?: string
  }) => {
    if (path === '/api/auth/session') {
      await selectScope(body.authenticated && body.cacheScope ? body.cacheScope : null)
    } else if (body.cacheScope) {
      await selectScope(body.cacheScope)
    }
  }).catch(() => undefined)
}

/** Returns true when running inside the native Android / iOS Capacitor shell. */
export function isNativeApp(): boolean {
  return Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'
}

/**
 * Force a full cache invalidation so that the next fetch for every cached
 * endpoint goes back to the server.  All cached entries are deleted — bodies
 * are not kept as stale fallbacks after a manual sync request.
 */
export async function forceSync(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const db = await getDatabase()
    await db.run('DELETE FROM api_cache')
  } catch {
    // If the DB isn't open yet there's nothing to clear.
  }
}

export async function initializeSyncCache(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') return
  await getDatabase()
  if (installed) return
  installed = true

  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // When init has a body (e.g. POST/PUT), we must pass duplex:'half' or the
    // Request constructor throws "The duplex member must be specified for a
    // request with a streaming body".
    const initWithDuplex: RequestInit & { duplex?: 'half' } = init ?? {}
    if (initWithDuplex.body) initWithDuplex.duplex = 'half'
    const request = new Request(input, initWithDuplex)
    const url = new URL(request.url)
    const isLocalApi = url.origin === window.location.origin && url.pathname.startsWith('/api/')
    const apiOrigin = Capacitor.getPlatform() === 'android' ? configuredApiOrigin : window.location.origin
    const targetUrl = isLocalApi ? new URL(`${url.pathname}${url.search}`, apiOrigin) : url
    const apiPath = `${targetUrl.pathname}${targetUrl.search}`
    const isApiRequest = isLocalApi
    const isApiGet = request.method === 'GET' && isApiRequest && targetUrl.pathname !== '/api/auth/session'
    const outboundHeaders = new Headers(request.headers)
    const makeApiRequest = (headers: Headers) => {
      const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : request.clone().body
      const options: RequestInit & { duplex?: 'half' } = {
        method: request.method,
        headers,
        body,
        mode: 'cors',
        credentials: 'include',
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer,
        integrity: request.integrity,
        keepalive: request.keepalive,
        signal: request.signal,
      }
      if (body) options.duplex = 'half'
      return new Request(targetUrl, options)
    }

    const isMutative = request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS'
    if (isMutative && isApiRequest && typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new TypeError('Failed to fetch: Connect to the internet to proceed. You must be online to update data or apply for loans.')
    }

    if (!isApiGet || !activeScope) {
      const response = await nativeFetch(isApiRequest ? makeApiRequest(outboundHeaders) : request)
      await scopeFromResponse(url.pathname, response)
      if (isMutative && isApiRequest && response.ok) {
        // Data has changed on the server: clear old cache so next reads always fetch latest data
        await forceSync()
      }
      return response
    }

    const key = `${activeScope}|${apiPath}`
    const cached = await readCachedResponse(key)
    if (cached) outboundHeaders.set('If-None-Match', cached.etag)

    let response: Response
    try {
      response = await nativeFetch(makeApiRequest(outboundHeaders))
    } catch (networkError) {
      // If offline or network error, return the latest cached data if available
      if (cached) {
        return new Response(cached.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Cache': 'offline-fallback',
          },
        })
      }
      throw networkError
    }

    if (response.status === 304 && cached) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
          'X-Sync-Cache': 'unchanged',
        },
      })
    }

    const etag = response.headers.get('ETag')
    if (response.ok && etag && response.headers.get('Content-Type')?.includes('application/json')) {
      const body = await response.clone().text()
      await writeCachedResponse(key, etag, body)
    }
    return response
  }
}
