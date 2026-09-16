import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Empty, ErrorBox, Loading } from '../components/Ui'
import { useAsync } from '../lib/hooks'

/** The audit trail: who asked for what, when, what changed, and whether it worked. */
export function Activity() {
  const navigate = useNavigate()
  const [open, setOpen] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(() => api.activity('?limit=100'), [])

  return (
    <>
      <button className="back" onClick={() => navigate('/')}>← الرئيسية</button>
      <h1 style={{ marginTop: 6 }}>سجل النشاط</h1>
      <p className="muted">كل خطوة مسجّلة: مين طلبها، امتى، إيه اللي اتغير، ونجحت ولا لأ.</p>

      {loading && <Loading rows={5} />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && !data.activity.length && <Empty>مفيش نشاط لسه</Empty>}

      <div className="log">
        {data?.activity.map(a => (
          <div key={a.id} onClick={() => setOpen(o => o === a.id ? null : a.id)}
               style={{ cursor: 'pointer' }}>
            <span className="t">{a.time}</span>
            <span>
              {a.result === 'failure' ? '✗ ' : ''}{a.action}
              {a.target ? <span className="faint"> · {a.target}</span> : null}
              {a.duration_ms !== null && (
                <span className="faint num"> · {a.duration_ms}ms</span>
              )}
              <div className="faint">{a.actor}</div>
              {a.error && <div className="warn">{a.error}</div>}
              {open === a.id && (a.before !== null || a.after !== null) && (
                <pre className="faint" style={{
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all', direction: 'ltr',
                  textAlign: 'start', fontSize: 11, marginTop: 6,
                }}>
                  {a.before !== null ? `before: ${JSON.stringify(a.before)}\n` : ''}
                  {a.after !== null ? `after: ${JSON.stringify(a.after)}` : ''}
                </pre>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
