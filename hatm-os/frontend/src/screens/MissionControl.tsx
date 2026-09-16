import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { CommandReply, WsEvent } from '../api/types'
import { AttendanceTrend, FeedbackRate, StatusBreakdown } from '../components/Charts'
import { ErrorBox, Loading } from '../components/Ui'
import { useAction, useAsync, useWs } from '../lib/hooks'

/**
 * Mission Control does not open with "how can I help?" — it opens with
 * "here is what needs you today", ranked, with the reason shown.
 */
export function MissionControl() {
  const navigate = useNavigate()
  const prios = useAsync(() => api.priorities(3), [])
  const summary = useAsync(() => api.summary(), [])
  const charts = useAsync(() => api.charts(), [])

  const [text, setText] = useState('')
  const [reply, setReply] = useState<CommandReply | null>(null)

  const onEvent = useCallback((e: WsEvent) => {
    if (e.kind === 'hello') return
    prios.reload()
    summary.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { connected } = useWs(onEvent)

  const send = useAction(async (t: string, choice?: Record<string, unknown>) => {
    const res = await api.command(t, choice)
    setReply(res)
    setText('')
    if (res.action?.type === 'workflow' && res.action.session_id) {
      setTimeout(() => navigate(`/sessions/${res.action!.session_id}`), 700)
    }
    if (res.action?.type === 'approval' && res.action.approval_id) {
      setTimeout(() => navigate(`/approvals/${res.action!.approval_id}`), 700)
    }
    prios.reload()
    summary.reload()
  })

  const f = summary.data?.followups

  return (
    <>
      <div className="row">
        <p className="faint">{summary.data?.greeting_date ?? ''}</p>
        {connected && <span className="live"><b>●</b> مباشر</span>}
      </div>
      <h1>صباح الخير يا حاتم</h1>

      <h2>أهم الأولويات</h2>
      {prios.loading && <Loading rows={3} label="بيرتّب الأولويات…" />}
      {prios.error && <ErrorBox error={prios.error} onRetry={prios.reload} />}
      {prios.data && !prios.data.top.length && (
        <div className="empty">مفيش حاجة معلّقة ✓ كل الجلسات مقفولة والموافقات خلصت.</div>
      )}
      {prios.data?.top.map(p => (
        <button className="prio" key={p.id}
                onClick={() => p.command ? void send.run(p.command) : navigate(p.action_url)}>
          <span className="n">{p.rank}</span>
          <div>
            <div className="t">{p.title}</div>
            {/* the backend ranks explainably — show the reason, never a black box */}
            <div className="why">{p.reasoning}</div>
          </div>
          <span className="go">{p.action_label}</span>
        </button>
      ))}

      <h2>المتابعات</h2>
      {summary.error && <ErrorBox error={summary.error} onRetry={summary.reload} />}
      {f && (
        <div className="stat">
          <div><b className="num">{f.no_feedback}</b><span>لم يرسلوا Feedback</span></div>
          <div><b className="num">{f.low_attendance}</b><span>حضروا أقل من ٧٠٪</span></div>
          <button style={{ textAlign: 'start', border: 'none', borderRadius: 8, padding: '12px 14px',
                           background: 'var(--bg)', font: 'inherit', color: 'inherit' }}
                  onClick={() => navigate('/review')}>
            <b className="num">{f.pending_reviews}</b><span>مراجعات معلّقة</span>
          </button>
          <button style={{ textAlign: 'start', border: 'none', borderRadius: 8, padding: '12px 14px',
                           background: 'var(--bg)', font: 'inherit', color: 'inherit' }}
                  onClick={() => navigate('/approvals')}>
            <b className="num">{f.pending_approvals}</b><span>موافقات معلّقة</span>
          </button>
        </div>
      )}

      {summary.data?.today_sessions.length ? (
        <>
          <h2>النهاردة</h2>
          <div className="list">
            {summary.data.today_sessions.map(s => (
              <div className="row" key={s.id}>
                <button style={{ background: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                        onClick={() => navigate(`/sessions/${s.id}`)}>
                  جلسة {s.title}
                </button>
                <span className="faint num">{s.time}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {charts.data && (
        <>
          <h2>الاتجاه</h2>
          <AttendanceTrend data={charts.data.attendance} />
          <StatusBreakdown data={charts.data.statuses} />
          <FeedbackRate data={charts.data.feedback} />
        </>
      )}

      <div className="bar"><div>
        {reply && (
          <div className="intent" style={{ marginBottom: 10 }}>
            {reply.action?.message ?? reply.clarification?.question ?? reply.intent}
            {reply.action?.brief && (
              <div style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{reply.action.brief.text}</div>
            )}
            {/* a clarification comes back as buttons, never as free text to re-type */}
            {reply.clarification?.options.map(o => (
              <button className="btn-ghost" key={o.session_id}
                      style={{ display: 'block', width: '100%', marginTop: 8, fontSize: 13 }}
                      disabled={send.busy}
                      onClick={() => void send.run(reply.text, { session_id: o.session_id })}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        {send.error && <ErrorBox error={send.error} />}
        <div className="chat">
          <input
            value={text} placeholder="اكتب أمر… مثلًا: اقفل سيشن React"
            aria-label="أمر"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && text.trim()) void send.run(text.trim()) }}
          />
          <button className="btn-primary" disabled={send.busy || !text.trim()}
                  onClick={() => void send.run(text.trim())}>
            {send.busy ? '…' : 'نفّذ'}
          </button>
        </div>
        <p className="hint">النظام بيفكر ويجهّز — ومبينفذش حاجة للعالم الخارجي غير بموافقتك.</p>
      </div></div>
    </>
  )
}
