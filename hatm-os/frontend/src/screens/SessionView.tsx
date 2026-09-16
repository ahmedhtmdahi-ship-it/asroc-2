import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AttendanceRecord, WsEvent } from '../api/types'
import { ErrorBox, IntervalBar, Loading, StatusPill } from '../components/Ui'
import { WorkflowView } from '../components/WorkflowView'
import { FLAG_AR, downloadCsv, statusAr, toCsv } from '../lib/format'
import { useAction, useAsync, useWs } from '../lib/hooks'

type SortKey = 'name' | 'minutes' | 'percentage' | 'status' | 'disconnects'

export function SessionView() {
  const { id } = useParams()
  const sid = Number(id)
  const navigate = useNavigate()
  const att = useAsync(() => api.attendance(sid), [sid])
  const run = useAsync(() => api.run(sid), [sid])

  const [filter, setFilter] = useState<string>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'percentage', dir: 1 })
  const [expanded, setExpanded] = useState<number | null>(null)

  const onEvent = useCallback((e: WsEvent) => {
    if (e.kind === 'workflow' || e.kind === 'session' || e.kind === 'review') {
      if (e.session_id === undefined || e.session_id === sid) { att.reload(); run.reload() }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid])
  useWs(onEvent)

  const close = useAction(async () => {
    await api.closeSession(sid)
    run.reload()
    att.reload()
  })

  const records = useMemo(() => att.data?.records ?? [], [att.data])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    records.filter(r => !r.excluded).forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [records])

  const shown = useMemo(() => {
    const rows = records.filter(r => filter === 'all' || r.status === filter)
    const val = (r: AttendanceRecord) =>
      sort.key === 'name' ? r.name : sort.key === 'status' ? r.status : r[sort.key]
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b)
      if (typeof x === 'string' || typeof y === 'string') {
        return String(x).localeCompare(String(y), 'ar') * sort.dir
      }
      return ((x as number) - (y as number)) * sort.dir
    })
  }, [records, filter, sort])

  if (att.loading) return <Loading rows={5} />
  if (att.error) return <ErrorBox error={att.error} onRetry={att.reload} />
  if (!att.data) return null

  const s = att.data.session
  const r = run.data?.run ?? null
  const canClose = !r || ['completed', 'failed', 'cancelled'].includes(r.status)

  const th = (key: SortKey, label: string) => (
    <th className="sortable"
        onClick={() => setSort(o => ({ key, dir: o.key === key ? (o.dir === 1 ? -1 : 1) : 1 }))}>
      {label}{sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <>
      <button className="back" onClick={() => navigate('/')}>← الرئيسية</button>
      <h1 style={{ marginTop: 6 }}>{s.title} — {s.date_ar}</h1>
      <p className="muted">
        {s.program} · <span className="num">{s.planned_start}</span> →{' '}
        <span className="num">{s.planned_end}</span> ·{' '}
        <span className="num">{Math.round(s.planned_minutes)}</span> دقيقة ·{' '}
        <span className={`pill ${s.status === 'closed' ? 'green' : 'grey'}`}>{statusAr(s.status)}</span>
      </p>

      {r && <WorkflowView run={r} />}
      {r?.pause_reason === 'needs_review' && (
        <button className="btn-primary" style={{ marginTop: 12, width: '100%' }}
                onClick={() => navigate(`/review/${sid}`)}>
          راجع الأسماء دلوقتي
        </button>
      )}
      {r?.status === 'awaiting_approval' && (
        <button className="btn-primary" style={{ marginTop: 12, width: '100%' }}
                onClick={() => navigate('/approvals')}>
          روح للموافقة
        </button>
      )}
      {close.error && <ErrorBox error={close.error} />}
      {canClose && s.status !== 'closed' && (
        <button className="btn-primary" style={{ marginTop: 12, width: '100%' }}
                disabled={close.busy} onClick={() => void close.run()}>
          {close.busy ? 'بيبدأ…' : 'اقفل الجلسة'}
        </button>
      )}

      {records.length > 0 && (
        <>
          <h2>الحضور</h2>
          <div className="stat">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k}><b className="num">{v}</b><span>{statusAr(k)}</span></div>
            ))}
          </div>

          <div className="tabs">
            {[['all', 'الكل'], ['present', 'حاضر'], ['late', 'متأخر'], ['partial', 'جزئي'],
              ['absent', 'غايب'], ['needs_review', 'للمراجعة']].map(([k, label]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                {label}
                {k !== 'all' && counts[k] ? <span className="num"> {counts[k]}</span> : null}
              </button>
            ))}
          </div>

          <table>
            <thead>
              <tr>
                {th('name', 'المتدرب')}
                {th('minutes', 'دقايق')}
                {th('percentage', 'النسبة')}
                {th('status', 'الحالة')}
                {th('disconnects', 'انقطاع')}
              </tr>
            </thead>
            <tbody>
              {shown.map(rec => (
                <tr key={rec.id} onClick={() => setExpanded(e => e === rec.id ? null : rec.id)}
                    style={{ cursor: 'pointer', opacity: rec.excluded ? 0.45 : 1 }}>
                  <td>
                    {rec.trainee_id ? (
                      <button style={{ background: 'none', padding: 0, font: 'inherit',
                                       color: 'var(--brand)' }}
                              onClick={e => { e.stopPropagation(); navigate(`/trainees/${rec.trainee_id}`) }}>
                        {rec.name}
                      </button>
                    ) : rec.name}
                    {expanded === rec.id && (
                      <div className="faint" style={{ marginTop: 6 }}>
                        <div>Zoom: {rec.zoom_name ?? '—'} · مطابقة: {rec.match_method ?? '—'}
                          {' '}(<span className="num">{Math.round(rec.match_confidence * 100)}%</span>)</div>
                        {rec.first_join && (
                          <div className="num">{rec.first_join} → {rec.last_leave}</div>
                        )}
                        {rec.merged_intervals.length > 0 && s.planned_start && s.planned_end && (
                          <IntervalBar
                            intervals={rec.merged_intervals.map(([a, b]) =>
                              [a.slice(11, 16), b.slice(11, 16)] as [string, string])}
                            start={s.planned_start} end={s.planned_end} />
                        )}
                        {rec.flags.length > 0 && (
                          <div>{rec.flags.map(fl => FLAG_AR[fl] ?? fl).join(' · ')}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="num">{Math.round(rec.minutes)}</td>
                  <td className="num">{Math.round(rec.percentage)}%</td>
                  <td className="chg"><StatusPill status={rec.status} /></td>
                  <td className="num">{rec.disconnects || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="hint">مفيش صفوف في الفلتر ده</p>}

          <button className="btn-ghost" style={{ marginTop: 14, width: '100%' }}
                  onClick={() => downloadCsv(
                    `attendance-${s.title}-${s.date.slice(0, 10)}.csv`,
                    toCsv(shown.map(x => ({ ...x, status_ar: statusAr(x.status) })), [
                      ['name', 'المتدرب'], ['email', 'الإيميل'], ['zoom_name', 'اسم Zoom'],
                      ['minutes', 'الدقايق'], ['percentage', 'النسبة'], ['status_ar', 'الحالة'],
                      ['disconnects', 'انقطاع'], ['match_method', 'طريقة المطابقة'],
                    ]))}>
            نزّل CSV
          </button>
        </>
      )}
    </>
  )
}
