import type { ReactNode } from 'react'
import type { AppError } from '../api/client'
import { statusAr, statusPill } from '../lib/format'

export function Loading({ rows = 3, label = 'بيحمّل…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <p className="faint">{label}</p>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

/** Shows the backend's own error message — the contract says it is meant for Hatem, not a generic string. */
export function ErrorBox({ error, onRetry }: { error: AppError; onRetry?: () => void }) {
  const retryAfter = error.extra?.retry_after as number | undefined
  return (
    <div className="err" role="alert">
      <div>{error.message}</div>
      <div className="faint" style={{ marginTop: 4 }}>
        <span className="num">{error.code}</span>
        {retryAfter ? ` · هيحاول تاني بعد ${Math.round(retryAfter / 60)} دقيقة` : ''}
      </div>
      {onRetry && (
        <button className="btn-ghost" style={{ marginTop: 10 }} onClick={onRetry}>حاول تاني</button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function StatusPill({ status, pct }: { status: string; pct?: number }) {
  return (
    <span className={`pill ${statusPill(status)}`}>
      {statusAr(status)}
      {pct !== undefined && status !== 'absent' ? <> <span className="num">{Math.round(pct)}%</span></> : null}
    </span>
  )
}

/**
 * Attendance intervals drawn against the session window, so a 5-minute visitor
 * is obvious at a glance during review.
 */
export function IntervalBar({ intervals, start, end }: {
  intervals: [string, string][]; start: string; end: string
}) {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const s = toMin(start)
  const span = Math.max(1, toMin(end) - s)
  return (
    <>
      <div className="tl" aria-hidden="true">
        {intervals.map(([a, b], i) => (
          <i key={i} style={{
            insetInlineStart: `${((toMin(a) - s) / span) * 100}%`,
            width: `${((toMin(b) - toMin(a)) / span) * 100}%`,
            left: `${((toMin(a) - s) / span) * 100}%`,
          }} />
        ))}
      </div>
      <div className="tlx">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </>
  )
}
