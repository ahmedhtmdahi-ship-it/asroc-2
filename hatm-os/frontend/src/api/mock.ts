/**
 * In-memory mock of the backend contract (VITE_USE_MOCK=true).
 * Lets the UI be built and demoed with no API running — Phase 0 requirement.
 * Faked Arabic names only; it mirrors the prototype's session.
 */
import type { Approval, AttendanceRecord, ReviewItem, Run, SessionRow } from './types'

const ROSTER = [
  'أحمد محمد علي', 'أحمد محمود حسن', 'أحمد مصطفى', 'سارة عبدالله', 'محمد علي',
  'محمد علي حسن', 'نورهان سيد', 'يوسف إبراهيم', 'مريم خالد', 'عمر فاروق',
  'هدير رمضان', 'كريم سامي', 'فاطمة الزهراء', 'مصطفى جمال', 'ندى أشرف',
  'عبدالرحمن طارق', 'رنا محسن', 'إسلام عادل', 'منة الله حسام', 'بلال عصام',
  'شروق ناصر', 'زياد وائل', 'آية مجدي', 'حسام الدين',
].map((name_ar, i) => ({
  trainee_id: i + 1, name_ar, name_en: null,
  email: `t${i + 1}@example.com`,
}))

const STEPS = [
  { name: 'fetch_zoom', label: 'تنزيل تقرير Zoom' },
  { name: 'compute_durations', label: 'حساب دقايق الحضور' },
  { name: 'match_names', label: 'مطابقة الأسماء مع المتدربين' },
  { name: 'evaluate', label: 'تطبيق قواعد البرنامج' },
  { name: 'approve_sheet', label: 'موافقة تحديث الشيت' },
  { name: 'write_sheet', label: 'تحديث شيت الحضور' },
  { name: 'compose_messages', label: 'تجهيز رسائل المتابعة' },
  { name: 'approve_messages', label: 'موافقة الرسائل' },
  { name: 'send_messages', label: 'إرسال الرسائل' },
  { name: 'finalize', label: 'إغلاق الجلسة' },
]

const iso = (d: Date) => d.toISOString()
const yesterday = new Date(Date.now() - 864e5)
yesterday.setHours(18, 0, 0, 0)
const end = new Date(yesterday.getTime() + 2 * 3600e3)

const session: SessionRow = {
  id: 412, title: 'React', status: 'needs_review', program_id: 3, program: 'React',
  date: iso(yesterday), date_ar: '17 أغسطس', planned_start: '18:00', planned_end: '20:00',
  planned_minutes: 120, zoom_meeting_id: '81244710932', closed_at: null,
}

type State = {
  session: SessionRow
  run: Run
  reviews: ReviewItem[]
  records: AttendanceRecord[]
  approvals: Approval[]
  nextApproval: number
}

const mk = (
  id: number, trainee_id: number | null, name: string, minutes: number, status: string,
): AttendanceRecord => ({
  id, trainee_id, name, zoom_name: name, email: null, minutes,
  percentage: Math.round((minutes / 120) * 1000) / 10, status: status as AttendanceRecord['status'],
  flags: [], disconnects: 0, first_join: '18:00', last_leave: '20:00', merged_intervals: [],
  match_method: 'email', match_confidence: 1, needs_review: false, excluded: false,
})

const state: State = {
  session: { ...session },
  run: {
    run_id: 'mock-run', definition: 'close_session', status: 'paused',
    current_step: 'match_names', pause_reason: 'needs_review', resume_token: null,
    completed_steps: ['fetch_zoom', 'compute_durations'], steps: STEPS, error: null,
    events: [
      { at: iso(new Date()), kind: 'step_done', step: 'fetch_zoom', detail: '25 صف' },
      { at: iso(new Date()), kind: 'step_done', step: 'compute_durations', detail: '21 شخص' },
      { at: iso(new Date()), kind: 'paused', step: 'match_names', reason: 'needs_review' },
    ],
    session_id: 412, context: {}, updated_at: iso(new Date()),
  },
  reviews: [
    {
      review_id: 88, session_id: 412, zoom_name: 'احمد م.', zoom_email: null,
      total_minutes: 96, merged_intervals: [['18:03', '19:12'], ['19:20', '19:47']],
      merged_intervals_iso: [], disconnects: 1, match_method: 'fuzzy',
      suggestions: [
        { trainee_id: 2, score: 0.88, reason: 'token_set', name_ar: 'أحمد محمود حسن', email: null },
        { trainee_id: 3, score: 0.84, reason: 'translit', name_ar: 'أحمد مصطفى', email: null },
        { trainee_id: 1, score: 0.79, reason: 'token_set', name_ar: 'أحمد محمد علي', email: null },
      ],
    },
    {
      review_id: 89, session_id: 412, zoom_name: 'Ahmed Mostafa', zoom_email: null,
      total_minutes: 120, merged_intervals: [['18:00', '20:00']], merged_intervals_iso: [],
      disconnects: 0, match_method: 'fuzzy',
      suggestions: [
        { trainee_id: 3, score: 0.86, reason: 'translit', name_ar: 'أحمد مصطفى', email: null },
        { trainee_id: 2, score: 0.61, reason: 'token_set', name_ar: 'أحمد محمود حسن', email: null },
      ],
    },
    {
      review_id: 90, session_id: 412, zoom_name: 'محمد علي', zoom_email: null,
      total_minutes: 120, merged_intervals: [['18:00', '20:00']], merged_intervals_iso: [],
      disconnects: 0, match_method: 'fuzzy',
      suggestions: [
        { trainee_id: 5, score: 0.95, reason: 'token_set', name_ar: 'محمد علي', email: null },
        { trainee_id: 6, score: 0.93, reason: 'token_set', name_ar: 'محمد علي حسن', email: null },
      ],
    },
  ],
  records: [
    mk(1, 4, 'سارة عبدالله', 95, 'partial'), mk(2, 8, 'يوسف إبراهيم', 40, 'absent'),
    mk(3, 16, 'عبدالرحمن طارق', 65, 'partial'), mk(4, 7, 'نورهان سيد', 98, 'late'),
    mk(5, 11, 'هدير رمضان', 113, 'present'), mk(6, 23, 'آية مجدي', 0, 'absent'),
    mk(7, 24, 'حسام الدين', 0, 'absent'), mk(8, 12, 'كريم سامي', 120, 'present'),
    mk(9, 9, 'مريم خالد', 120, 'present'), mk(10, 22, 'زياد وائل', 80, 'partial'),
  ],
  approvals: [],
  nextApproval: 301,
}

function sheetApproval(): Approval {
  return {
    id: state.nextApproval++, type: 'update_sheet', status: 'pending',
    preview: {
      summary: `تحديث شيت الحضور — ${state.records.length} صف · React 17 أغسطس`,
      session_id: 412, session_title: 'React', sheet_id: 'demo', tab: 'Attendance',
      column: 'React 2026-08-17',
      counts: { present: 3, late: 1, partial: 3, absent: 3 },
      rows: state.records.map(r => ({
        trainee_id: r.trainee_id!, name: r.name, minutes: r.minutes,
        percentage: r.percentage, status: r.status,
      })),
    },
    payload: { session_id: 412, stage: 'sheet' },
    created_at: iso(new Date()), expires_at: iso(new Date(Date.now() + 72 * 3600e3)),
    decided_by: null, decided_at: null, reject_reason: null, workflow_run_id: 'mock-run',
  }
}

function messagesApproval(): Approval {
  const targets = state.records.filter(r => r.status === 'absent' || r.status === 'partial')
  const messages = targets.map((r, i) => ({
    message_id: 500 + i, trainee_id: r.trainee_id!, name: r.name,
    email: `t${r.trainee_id}@example.com`,
    type: r.status === 'absent' ? 'absence' : 'partial',
    subject: r.status === 'absent' ? 'غيابك عن جلسة React' : 'حضورك الجزئي — React',
    body: r.status === 'absent'
      ? `أهلاً ${r.name.split(' ')[0]}،\n\nلاحظنا غيابك عن جلسة React بتاريخ 17 أغسطس.\n\nلو فيه ظرف منعك، ابعتلنا رد على الرسالة دي.\n\nتحياتنا،\nفريق React`
      : `أهلاً ${r.name.split(' ')[0]}،\n\nسجّلنا حضورك ${r.percentage}% من جلسة React\n(${r.minutes} دقيقة من أصل 120).\n\nالحد الأدنى للحضور 80%.\n\nتحياتنا،\nفريق React`,
    excluded: false,
  }))
  return {
    id: state.nextApproval++, type: 'send_messages', status: 'pending',
    preview: {
      summary: `${messages.length} رسالة متابعة — React 17 أغسطس`, session_id: 412,
      recipient_count: messages.length, channel: 'email', send_enabled: false, messages,
    },
    payload: { session_id: 412, stage: 'messages', messages },
    created_at: iso(new Date()), expires_at: iso(new Date(Date.now() + 72 * 3600e3)),
    decided_by: null, decided_at: null, reject_reason: null, workflow_run_id: 'mock-run',
  }
}

function advance(stage: string) {
  const r = state.run
  if (stage === 'sheet') {
    r.completed_steps = [...r.completed_steps, 'approve_sheet', 'write_sheet', 'compose_messages']
    r.current_step = 'approve_messages'
    r.resume_token = 'messages'
    r.events = [...r.events, { at: iso(new Date()), kind: 'step_done', step: 'write_sheet', detail: '10 خلية' }]
    state.approvals.push(messagesApproval())
  } else {
    r.completed_steps = [...r.completed_steps, 'approve_messages', 'send_messages', 'finalize']
    r.current_step = null
    r.status = 'completed'
    r.resume_token = null
    state.session.status = 'closed'
    r.events = [...r.events, { at: iso(new Date()), kind: 'completed', step: null }]
  }
}

const pending = () => state.approvals.filter(a => a.status === 'pending')

export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await new Promise(r => setTimeout(r, 120))
  const body = init?.body ? JSON.parse(init.body as string) : {}
  const m = (re: RegExp) => path.match(re)

  if (path.startsWith('/api/sessions/') && path.endsWith('/attendance')) {
    return { session: state.session, records: state.records } as T
  }
  if (path.startsWith('/api/sessions/') && path.endsWith('/run')) return { run: state.run } as T
  if (path.startsWith('/api/sessions/') && path.endsWith('/close')) {
    return { run_id: state.run.run_id, status: state.run.status, session_id: 412 } as T
  }
  if (m(/^\/api\/sessions\/\d+$/)) return { ...state.session, run: state.run } as T
  if (path === '/api/sessions') return { sessions: [state.session] } as T

  if (path.startsWith('/api/reviews/pending')) {
    return {
      sessions: state.reviews.length ? [{
        id: 412, title: 'React', program: 'React', date: '17 أغسطس',
        planned_start: '18:00', planned_end: '20:00', planned_minutes: 120,
        stats: { auto_matched: 21, needs_review: state.reviews.length, unmatched: 0 },
        roster: ROSTER,
      }] : [],
      reviews: state.reviews,
    } as T
  }
  const conf = m(/^\/api\/reviews\/(\d+)\/(confirm|reject)$/)
  if (conf) {
    const id = Number(conf[1])
    state.reviews = state.reviews.filter(r => r.review_id !== id)
    if (!state.reviews.length) {
      state.run.completed_steps = [...state.run.completed_steps, 'match_names', 'evaluate']
      state.run.current_step = 'approve_sheet'
      state.run.status = 'awaiting_approval'
      state.run.pause_reason = 'approval'
      state.run.resume_token = 'sheet'
      state.session.status = 'awaiting_approval'
      if (!state.approvals.length) state.approvals.push(sheetApproval())
    }
    return {
      ok: true, remaining: state.reviews.length, alias_saved: conf[2] === 'confirm',
      trainee: body.trainee_id ? ROSTER.find(r => r.trainee_id === body.trainee_id)?.name_ar : '',
    } as T
  }

  if (path.startsWith('/api/approvals?')) {
    const status = new URLSearchParams(path.split('?')[1]).get('status') ?? 'pending'
    return { approvals: state.approvals.filter(a => a.status === status) } as T
  }
  const ap = m(/^\/api\/approvals\/(\d+)(\/approve|\/reject|\/payload)?$/)
  if (ap) {
    const a = state.approvals.find(x => x.id === Number(ap[1]))!
    if (ap[2] === '/approve') {
      if (a.status === 'pending') { a.status = 'executed'; advance(a.payload?.stage ?? 'sheet') }
      return { id: a.id, status: a.status } as T
    }
    if (ap[2] === '/reject') {
      if (a.status === 'pending') {
        a.status = 'rejected'; a.reject_reason = body.reason ?? null
        advance(a.payload?.stage ?? 'sheet')
      }
      return { id: a.id, status: a.status } as T
    }
    if (ap[2] === '/payload') {
      const msgs = body.edited_content?.messages
      if (msgs) {
        a.payload = { ...a.payload, messages: msgs }
        a.preview = { ...a.preview, messages: msgs,
          recipient_count: msgs.filter((x: { excluded?: boolean }) => !x.excluded).length }
      }
      return a as T
    }
    return a as T
  }

  if (path.startsWith('/api/dashboard/priorities')) {
    const top: unknown[] = []
    if (state.reviews.length) {
      top.push({
        id: 'review:412', title: `${state.reviews.length} أسماء محتاجة تأكيدك — React`,
        kind: 'review', score: 6.1, rank: top.length + 1,
        reasoning: `بيأثر على ${state.reviews.length} شخص · بيوقف خطوات تانية`,
        reasons: [], action_label: 'راجع', action_url: '/review/412',
        affected: state.reviews.length, session_id: 412,
      })
    }
    pending().forEach(a => top.push({
      id: `approval:${a.id}`, title: a.preview.summary, kind: 'decision', score: 7.4,
      rank: top.length + 1, reasoning: 'محتاج قرارك · بيوقف خطوات تانية',
      reasons: [], action_label: 'راجع ووافق', action_url: `/approvals/${a.id}`,
      affected: a.preview.recipient_count ?? a.preview.rows?.length ?? 0, approval_id: a.id,
    }))
    return { top: top.slice(0, 3), all: top } as T
  }
  if (path === '/api/dashboard/summary') {
    return {
      greeting_date: 'الثلاثاء 17 أغسطس',
      today_sessions: [{ id: 500, title: 'Power BI', status: 'scheduled', time: '18:00' }],
      followups: {
        no_feedback: 18, low_attendance: 6, pending_reviews: state.reviews.length,
        pending_approvals: pending().length, unclosed_sessions: state.session.status === 'closed' ? 0 : 1,
      },
      programs: [{ id: 3, name: 'React' }],
    } as T
  }
  if (path.startsWith('/api/dashboard/charts')) {
    return {
      attendance: [
        { session: 'React 08-03', rate: 88 }, { session: 'React 08-10', rate: 79 },
        { session: 'React 08-17', rate: 71 },
      ],
      statuses: [
        { session: 'React 08-03', present: 18, partial: 3, absent: 3 },
        { session: 'React 08-10', present: 15, partial: 5, absent: 4 },
        { session: 'React 08-17', present: 13, partial: 6, absent: 5 },
      ],
      feedback: { sent: 40, replied: 22, rate: 55 },
    } as T
  }
  if (path.startsWith('/api/trainees/')) {
    return {
      trainee: { id: 1, name_ar: 'أحمد محمد علي', email: 't1@example.com', zoom_aliases: ['احمد م'] },
      timeline: [
        { at: iso(yesterday), date: '17 أغسطس', kind: 'attendance', status: 'present',
          text: 'React — 96 دقيقة (80%)' },
        { at: iso(new Date()), date: '17 أغسطس', kind: 'message', status: 'sent',
          text: 'feedback: رأيك يهمنا (sent)' },
      ],
    } as T
  }
  if (path.startsWith('/api/activity')) {
    return {
      activity: state.run.events.map((e, i) => ({
        id: i, at: e.at, time: new Date(e.at).toTimeString().slice(0, 5),
        actor: 'workflow:mock', action: `${e.kind} ${e.step ?? ''}`.trim(),
        target: 'session:412', result: 'success', error: null, duration_ms: 120,
        before: null, after: null, workflow_run_id: 'mock-run',
      })).reverse(),
    } as T
  }
  if (path === '/api/command') {
    const text: string = body.text ?? ''
    if (/اقفل|close/i.test(text)) {
      return {
        text, intent: 'close_session', entities: { session_id: 412 }, confidence: 0.94,
        clarification: null,
        action: { type: 'workflow', run_id: 'mock-run', session_id: 412,
          message: 'فهمت: إغلاق جلسة React — الثلاثاء 17 أغسطس' },
      } as T
    }
    return {
      text, intent: 'unknown', entities: {}, confidence: 0.2,
      clarification: { question: 'مش فاهم الأمر ده لسه — جرّب: «اقفل سيشن React»', options: [] },
      action: null,
    } as T
  }
  throw new Error(`mock: no route for ${path}`)
}
