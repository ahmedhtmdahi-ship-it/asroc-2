import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { ReviewItem, ReviewSession } from '../api/types'
import { Empty, ErrorBox, IntervalBar, Loading } from '../components/Ui'
import { useAction, useAsync } from '../lib/hooks'

/**
 * Review — the most-used screen in the first months, so it is keyboard-first:
 * 1–9 pick a candidate · Enter confirms the top one · S skip · X not a trainee
 * / manual search · ← → move between rows.
 * Every confirmation teaches the matcher (alias saved server-side).
 */
export function Review() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const sid = sessionId ? Number(sessionId) : undefined
  const { data, error, loading, reload } = useAsync(() => api.pendingReviews(sid), [sid])

  const [cursor, setCursor] = useState(0)
  const [done, setDone] = useState<Record<number, string>>({})
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const reviews = useMemo(() => data?.reviews ?? [], [data])
  const session: ReviewSession | undefined = data?.sessions[0]
  const open = reviews.filter(r => !done[r.review_id])
  const current: ReviewItem | undefined = open[Math.min(cursor, Math.max(0, open.length - 1))]

  const confirm = useAction(async (reviewId: number, traineeId: number, name: string) => {
    const res = await api.confirmReview(reviewId, traineeId)
    setDone(d => ({ ...d, [reviewId]: name }))
    setSearching(false)
    setQuery('')
    if (res.remaining === 0 && session) setTimeout(() => navigate(`/sessions/${session.id}`), 900)
  })

  const skipNotTrainee = useAction(async (reviewId: number) => {
    const res = await api.rejectReview(reviewId)
    setDone(d => ({ ...d, [reviewId]: 'مستبعد' }))
    if (res.remaining === 0 && session) setTimeout(() => navigate(`/sessions/${session.id}`), 900)
  })

  const roster = session?.roster ?? []
  const hits = useMemo(() => {
    const q = query.trim()
    if (!q) return roster.slice(0, 8)
    return roster.filter(t =>
      t.name_ar.includes(q) || (t.name_en ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (t.email ?? '').toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  }, [query, roster])

  const onKey = useCallback((e: KeyboardEvent) => {
    if (!current || confirm.busy || skipNotTrainee.busy) return
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') { setSearching(false); setQuery('') }
      return
    }
    if (e.key >= '1' && e.key <= '9') {
      const s = current.suggestions[Number(e.key) - 1]
      if (s) { e.preventDefault(); void confirm.run(current.review_id, s.trainee_id, s.name_ar) }
      return
    }
    switch (e.key) {
      case 'Enter': {
        const s = current.suggestions[0]
        if (s) { e.preventDefault(); void confirm.run(current.review_id, s.trainee_id, s.name_ar) }
        break
      }
      case '/':
        e.preventDefault()
        setSearching(true)
        setTimeout(() => searchRef.current?.focus(), 0)
        break
      case 's': case 'S': case 'ط':
        e.preventDefault()
        setCursor(c => Math.min(c + 1, open.length - 1))
        break
      case 'x': case 'X': case 'ء':
        e.preventDefault()
        void skipNotTrainee.run(current.review_id)
        break
      case 'ArrowLeft':
        setCursor(c => Math.min(c + 1, open.length - 1))
        break
      case 'ArrowRight':
        setCursor(c => Math.max(0, c - 1))
        break
    }
  }, [current, confirm, skipNotTrainee, open.length])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  if (loading) return <Loading rows={4} />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!reviews.length) {
    return (
      <>
        <h1>المراجعة</h1>
        <Empty>مفيش مراجعات معلّقة ✓</Empty>
        <button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => navigate('/')}>
          ارجع للرئيسية
        </button>
      </>
    )
  }

  const totalDone = Object.keys(done).length

  return (
    <>
      {session && (
        <p className="faint">
          {session.program} · جلسة {session.date} · <span className="num">{session.planned_start}</span>
          {' → '}<span className="num">{session.planned_end}</span>
        </p>
      )}
      <h1>
        <span className="num">{open.length}</span> {open.length === 1 ? 'اسم محتاج' : 'أسماء محتاجة'} تأكيدك
      </h1>
      {session && (
        <p className="muted">
          النظام طابق <span className="num">{session.stats.auto_matched}</span> تلقائيًا.
          دول مش متأكد منهم — واختيارك بيتحفظ عشان المرة الجاية يعرفهم لوحده.
        </p>
      )}
      <p className="hint">
        <span className="kbd">1–9</span> اختيار · <span className="kbd">Enter</span> تأكيد الأول ·
        {' '}<span className="kbd">/</span> بحث · <span className="kbd">S</span> تخطي ·
        {' '}<span className="kbd">X</span> مش متدرب · <span className="kbd">← →</span> تنقل
      </p>

      {confirm.error && <ErrorBox error={confirm.error} />}
      {skipNotTrainee.error && <ErrorBox error={skipNotTrainee.error} />}

      {reviews.map(r => {
        const settled = done[r.review_id]
        if (settled) {
          return (
            <div className="rv" key={r.review_id} style={{ opacity: 0.55 }}>
              <div className="row">
                <span className="zn">{r.zoom_name}</span>
                <span className="pill green">✓ {settled}</span>
              </div>
              {settled !== 'مستبعد' && (
                <div className="faint">
                  اتحفظ: «{r.zoom_name}» = {settled} — المرة الجاية بيتعرف عليه لوحده
                </div>
              )}
            </div>
          )
        }
        const isCurrent = current?.review_id === r.review_id
        const gap = r.suggestions.length > 1
          ? r.suggestions[0].score - r.suggestions[1].score : 1
        return (
          <div className={`rv${isCurrent ? ' active' : ''}`} key={r.review_id}>
            <div className="row">
              <span className="zn">{r.zoom_name || '(بدون اسم)'}</span>
              <span className="pill grey num">{Math.round(r.total_minutes)} د</span>
            </div>
            <div className="zm">
              اسم في Zoom · {r.zoom_email ? r.zoom_email : 'بدون إيميل'}
              {r.disconnects > 0 && <> · <span className="num">{r.disconnects}</span> انقطاع</>}
            </div>
            {session && (
              <IntervalBar intervals={r.merged_intervals} start={session.planned_start}
                           end={session.planned_end} />
            )}
            {gap < 0.10 && r.suggestions.length > 1 && (
              <div className="warn">
                ⚠ الفرق بين أول اتنين <span className="num">{Math.round(gap * 100)}%</span> بس — دي الحالة الخطيرة
              </div>
            )}
            {!r.suggestions.length && (
              <div className="warn">⚠ مفيش مرشحين قريبين — دوّر يدوي أو استبعده</div>
            )}
            {r.suggestions.map((s, i) => (
              <button
                className={`sug${i === 0 && gap < 0.10 ? ' close' : ''}`}
                key={s.trainee_id}
                disabled={confirm.busy}
                onClick={() => void confirm.run(r.review_id, s.trainee_id, s.name_ar)}
              >
                <span><span className="k">{i + 1}</span>{s.name_ar}</span>
                <span className="sc">{Math.round(s.score * 100)}%</span>
              </button>
            ))}
            {isCurrent && searching && (
              <div style={{ marginTop: 10 }}>
                <input
                  ref={searchRef} className="num" type="text" value={query}
                  placeholder="دوّر في الروستر…" dir="rtl"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1px solid var(--line)', background: 'var(--surface)',
                    color: 'var(--ink)', font: 'inherit',
                  }}
                  onChange={e => setQuery(e.target.value)}
                />
                {hits.map(t => (
                  <button className="sug" key={t.trainee_id} disabled={confirm.busy}
                          onClick={() => void confirm.run(r.review_id, t.trainee_id, t.name_ar)}>
                    <span>{t.name_ar}</span>
                    <span className="sc">{t.email ?? ''}</span>
                  </button>
                ))}
                {!hits.length && <p className="hint">مفيش نتائج</p>}
              </div>
            )}
            <div className="other">
              <button className="btn-ghost" disabled={confirm.busy}
                      onClick={() => { setSearching(v => !v); setTimeout(() => searchRef.current?.focus(), 0) }}>
                بحث يدوي
              </button>
              <button className="btn-ghost" disabled={skipNotTrainee.busy}
                      onClick={() => void skipNotTrainee.run(r.review_id)}>
                مش من المتدربين
              </button>
            </div>
          </div>
        )
      })}

      <p className="hint" style={{ marginTop: 16 }}>
        <span className="num">{totalDone}</span> من <span className="num">{reviews.length}</span> اتراجعوا
      </p>
    </>
  )
}
