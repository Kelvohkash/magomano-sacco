import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { formatDate } from '../../format'
import { readJsonResponse, requestErrorMessage } from '../../networkErrors'

export function MemberTermsPage() {
  const [terms, setTerms] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/member/terms', { signal: controller.signal })
      .then(async (response) => {
        const result = await readJsonResponse<{ terms?: string; updatedAt?: string | null; error?: string }>(response)
        if (!response.ok) throw new Error(result.error ?? 'Could not load the terms and conditions.')
        setTerms(result.terms ?? '')
        setUpdatedAt(result.updatedAt ?? null)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(requestErrorMessage(cause, 'Could not load the terms and conditions.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="member-account-page">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">SACCO INFORMATION</p>
        <h1>Terms and conditions</h1>
        <p>Review the current terms set by the sacco administrators.</p>
      </div>
      <article className="member-account-card member-terms-card">
        <div className="member-account-card-heading">
          <span><FileText size={18} /></span>
          <div><h2>Magomano sacco terms</h2>{updatedAt && <p>Last updated {formatDate(updatedAt)}</p>}</div>
        </div>
        {error ? <p className="form-message error" role="alert">{error}</p>
          : loading ? <p className="admin-empty">Loading terms and conditions…</p>
            : terms ? <div className="member-terms-content">{terms}</div>
              : <p className="admin-empty">The SACCO has not published its terms and conditions yet.</p>}
      </article>
    </section>
  )
}
