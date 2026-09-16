import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Approval, MessagePreview } from '../api/types'
import { Empty, ErrorBox, Loading, StatusPill } from '../components/Ui'
import { expiryLabel, statusAr } from '../lib/format'
import { useAction, useAsync } from '../lib/hooks'

export function ApprovalInbox() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('pending')
  const { data, error, loading, reload } = useAsync(() => api.approvals(tab), [tab])

  return (
    <>
      <h1>صندوق الموافقات</h1>
      <p className="muted">ده المكان الوحيد اللي بيخرج منه أي فعل للعالم الحقيقي.</p>
      <div className="tabs">
        {[['pending', 'معلّقة'], ['executed', 'اتنفذت'], ['rejected', 'مرفوضة'],
          ['expired', 'منتهية']].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {loading && <Loading rows={3} />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && !data.approvals.length && (
        <Empty>{tab === 'pending' ? 'مفيش موافقات معلّقة ✓' : 'مفيش حاجة هنا'}</Empty>
      )}
      <div className="list">
        {data?.approvals.map(a => {
          const exp = expiryLabel(a.expires_at)
          return (
            <button className="prio" key={a.id} onClick={() => navigate(`/approvals/${a.id}`)}>
              <span className="n">{a.type === 'send_messages' ? '✉' : '▦'}</span>
              <div>
                <div className="t">{a.preview.summary}</div>
                <div className="why">
                  {a.type === 'send_messages' ? 'إرسال رسائل' : 'كتابة في شيت'}
                  {a.status === 'pending' && <> · <span className={exp.soon ? 'warn' : ''}>{exp.text}</span></>}
                  {a.decided_by && <> · قرار: {a.decided_by}</>}
                  {a.reject_reason && <> · السبب: {a.reject_reason}</>}
                </div>
              </div>
              <span className="go">{a.status === 'pending' ? 'راجع' : statusAr(a.status)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/**
 * Approval detail — clarity over beauty. Full preview (not a sample), per-recipient
 * exclude, inline edit, no optimistic UI, and the button disables on click.
 */
export function ApprovalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const approvalId = Number(id)
  const { data, error, loading, reload } = useAsync(() => api.approval(approvalId), [approvalId])

  const [messages, setMessages] = useState<MessagePreview[] | null>(null)
  const [openBody, setOpenBody] = useState<Record<number, boolean>>({})
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [dirty, setDirty] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (data?.preview.messages) setMessages(data.preview.messages.map(m => ({ ...m })))
  }, [data])

  const active = useMemo(() => (messages ?? []).filter(m => !m.excluded), [messages])

  const save = useAction(async () => {
    const fresh = await api.patchApproval(approvalId, { messages })
    setMessages(fresh.preview.messages?.map(m => ({ ...m })) ?? messages)
    setDirty(false)
  })

  const approve = useAction(async () => {
    if (dirty) await api.patchApproval(approvalId, { messages })
    const res = await api.approve(approvalId)
    setResult(res.status)
    reload()
  })

  const reject = useAction(async () => {
    const res = await api.reject(approvalId, reason || undefined)
    setResult(res.status)
    reload()
  })

  if (loading) return <Loading rows={4} />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return null

  const a: Approval = data
  const exp = expiryLabel(a.expires_at)
  const isSheet = a.type === 'update_sheet'
  const decided = a.status !== 'pending'
  const expired = exp.text.startsWith('انتهت')
  const busy = approve.busy || reject.busy || save.busy

  return (
    <>
      <button className="back" onClick={() => navigate('/approvals')}>← كل الموافقات</button>
      <h1 style={{ marginTop: 6 }}>{isSheet ? 'تحديث شيت الحضور' : 'رسائل المتابعة'}</h1>
      <p className="muted">{a.preview.summary}</p>

      {decided && (
        <div className={`impact ${a.status === 'executed' ? 'ok' : ''}`}>
          {a.status === 'executed' ? '✓ اتنفذت' : `الحالة: ${statusAr(a.status)}`}
          {a.decided_by ? ` · ${a.decided_by}` : ''}
          {a.reject_reason ? ` · ${a.reject_reason}` : ''}
        </div>
      )}
      {!decided && (
        <p className={`expiry${exp.soon ? ' soon' : ''}`}>
          {exp.soon ? '⚠ ' : ''}{exp.text}
        </p>
      )}

      {approve.error && <ErrorBox error={approve.error} />}
      {reject.error && <ErrorBox error={reject.error} />}
      {save.error && <ErrorBox error={save.error} />}

      {isSheet && (
        <>
          <p className="faint" style={{ marginTop: 10 }}>
            هيتكتب في عمود <span className="num">{a.preview.column}</span> · تبويب{' '}
            <span className="num">{a.preview.tab}</span>
          </p>
          <div className="stat">
            {Object.entries(a.preview.counts ?? {}).map(([k, v]) => (
              <div key={k}><b className="num">{v}</b><span>{statusAr(k)}</span></div>
            ))}
          </div>
          <h2>كل الصفوف (<span className="num">{a.preview.rows?.length ?? 0}</span>)</h2>
          <table>
            <thead>
              <tr><th>المتدرب</th><th>الدقايق</th><th>النسبة</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {a.preview.rows?.map(r => (
                <tr key={r.trainee_id}>
                  <td>{r.name}</td>
                  <td className="num">{Math.round(r.minutes)}</td>
                  <td className="num">{Math.round(r.percentage)}%</td>
                  <td className="chg"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">النسخة الحالية من الخلايا بتتحفظ في سجل النشاط قبل الكتابة.</p>
        </>
      )}

      {!isSheet && messages && (
        <>
          <div className={`impact${active.length === 0 ? ' ok' : ''}`}>
            {active.length === 0
              ? 'مش هيتبعت أي حاجة — كل المستقبلين مستبعدين'
              : <>هيتبعت <span className="num">{active.length}</span> رسالة لـ{' '}
                 <span className="num">{active.length}</span> شخص عبر الإيميل</>}
          </div>
          {a.preview.send_enabled === false && (
            <p className="hint">
              ⓘ <span className="num">FF_SEND_EMAIL=false</span> — الرسايل هتتحفظ كـ drafts في Gmail،
              مش هتتبعت فعليًا.
            </p>
          )}
          <h2>كل الرسائل (<span className="num">{messages.length}</span>)</h2>
          {messages.map((m, i) => (
            <div className={`msg${m.excluded ? ' off' : ''}`} key={m.message_id}>
              <div className="hd">
                <label>
                  <input
                    type="checkbox" checked={!m.excluded} disabled={decided || busy}
                    aria-label={`ابعت لـ ${m.name}`}
                    onChange={e => {
                      setMessages(ms => ms!.map((x, j) =>
                        j === i ? { ...x, excluded: !e.target.checked } : x))
                      setDirty(true)
                    }}
                  />
                  <span>{m.name}</span>
                </label>
                <span className={`pill ${m.type === 'absence' ? 'red' : 'amber'}`}>
                  {m.type === 'absence' ? 'غايب' : 'جزئي'}
                </span>
                <button className="tg" onClick={() => setOpenBody(o => ({ ...o, [i]: !o[i] }))}>
                  {openBody[i] ? 'اخفِ' : 'اعرض'}
                </button>
              </div>
              {openBody[i] && (
                <div className="body">
                  <div className="faint num" style={{ direction: 'ltr' }}>{m.email}</div>
                  {editing[i] ? (
                    <>
                      <input
                        type="text" value={m.subject ?? ''} aria-label="الموضوع"
                        onChange={e => {
                          setMessages(ms => ms!.map((x, j) =>
                            j === i ? { ...x, subject: e.target.value } : x))
                          setDirty(true)
                        }}
                      />
                      <textarea
                        rows={8} value={m.body} aria-label="نص الرسالة"
                        onChange={e => {
                          setMessages(ms => ms!.map((x, j) =>
                            j === i ? { ...x, body: e.target.value } : x))
                          setDirty(true)
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <b>{m.subject}</b>
                      {'\n'}{m.body}
                    </>
                  )}
                  {!decided && (
                    <button className="tg" style={{ marginTop: 8 }}
                            onClick={() => setEditing(o => ({ ...o, [i]: !o[i] }))}>
                      {editing[i] ? 'تم' : 'عدّل'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {dirty && !decided && (
            <p className="hint">
              فيه تعديلات لسه متحفظتش — هتتحفظ تلقائيًا لما توافق، أو{' '}
              <button className="tg" disabled={busy} onClick={() => void save.run()}>احفظ دلوقتي</button>
            </p>
          )}
        </>
      )}

      {result && (
        <div className="impact ok" role="status">
          {result === 'executed' ? '✓ اتنفذ' : result === 'approved' ? '✓ اتوافق عليه — بيتنفذ'
            : `الحالة: ${statusAr(result)}`}
        </div>
      )}

      {!decided && !expired && (
        <div className="bar"><div>
          {rejecting ? (
            <>
              <div className="chat">
                <input
                  type="text" value={reason} placeholder="سبب الرفض (اختياري)"
                  onChange={e => setReason(e.target.value)}
                />
                <button className="btn-red" disabled={busy} onClick={() => void reject.run()}>
                  {reject.busy ? 'بيرفض…' : 'أكّد الرفض'}
                </button>
              </div>
              <p className="hint">
                <button className="tg" onClick={() => setRejecting(false)}>إلغاء</button>
              </p>
            </>
          ) : (
            <>
              <div className="actions">
                <button className="btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>
                  ارفض
                </button>
                <button
                  className={isSheet ? 'btn-primary' : 'btn-green'}
                  disabled={busy || (!isSheet && active.length === 0)}
                  onClick={() => void approve.run()}
                >
                  {approve.busy ? 'بينفّذ…'
                    : isSheet ? 'اكتب في الشيت'
                    : a.preview.send_enabled === false ? 'جهّز الـ drafts'
                    : `ابعت ${active.length} رسالة`}
                </button>
              </div>
              <p className="hint">
                {isSheet ? 'مفيش خلية بتتكتب قبل الضغطة دي.'
                  : 'الزرار بيتقفل فورًا بعد الضغط — ضغطتين = إرسال واحد.'}
              </p>
            </>
          )}
        </div></div>
      )}
    </>
  )
}
