import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Empty, ErrorBox, Loading } from '../components/Ui'
import { statusAr } from '../lib/format'
import { useAsync } from '../lib/hooks'

const DOT: Record<string, string> = {
  attendance: '●', message: '✉', reply: '↩',
}

/** A person's history — read this before sending them anything. */
export function TraineeTimeline() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(() => api.timeline(Number(id)), [id])

  if (loading) return <Loading rows={4} />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return null

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}>← رجوع</button>
      <h1 style={{ marginTop: 6 }}>{data.trainee.name_ar}</h1>
      <p className="muted num" style={{ direction: 'ltr', textAlign: 'start' }}>
        {data.trainee.email ?? '—'}
      </p>
      {data.trainee.zoom_aliases.length > 0 && (
        <p className="faint">
          أسماء Zoom المحفوظة: {data.trainee.zoom_aliases.join(' · ')}
        </p>
      )}

      <h2>السجل</h2>
      {!data.timeline.length && <Empty>مفيش سجل لسه</Empty>}
      <div className="log">
        {data.timeline.map((t, i) => (
          <div key={i}>
            <span className="t">{t.date}</span>
            <span>
              {DOT[t.kind] ?? '•'} {t.text}
              {t.kind === 'attendance' && <> — <b>{statusAr(t.status)}</b></>}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
