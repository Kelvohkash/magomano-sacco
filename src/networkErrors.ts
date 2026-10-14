const CONNECTIVITY_MESSAGE = 'Connect to the internet to proceed.'

/**
 * Throws with a user-facing message when the browser / device reports it is
 * offline.  Call this at the top of any write operation (loan applications,
 * profile updates, etc.) that cannot be completed without a live connection.
 */
export function requireOnline(): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(CONNECTIVITY_MESSAGE)
  }
}


/**
 * Reads an API response without hiding the actual failure behind a JSON parser
 * exception. Cloudflare can return an empty response when a Function route is
 * missing, and proxies can return HTML error pages.
 */
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text()
  if (!body.trim()) {
    throw new Error(`The service returned an empty response (${response.status}). Please refresh and try again.`)
  }

  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(`The service returned an invalid response (${response.status}). Please refresh and try again.`)
  }
}

export function requestErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : ''
  const networkFailure = typeof navigator !== 'undefined' && !navigator.onLine
    || /failed to fetch|networkerror|network request failed|load failed|internet connection/i.test(message)

  if (networkFailure) return CONNECTIVITY_MESSAGE
  return message || fallback
}
