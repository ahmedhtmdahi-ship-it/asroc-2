import type {
  ActivityItem, Approval, AttendanceRecord, Charts, CommandReply, Priority,
  ReviewItem, ReviewSession, Run, SessionRow, Summary, TimelineItem,
} from './types'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN = import.meta.env.VITE_API_TOKEN ?? ''
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** Carries the backend's stable error code so screens can show `error.message`, not a generic one. */
export class AppError extends Error {
  code: string
  extra: Record<string, unknown>
  constructor(code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.code = code
    this.extra = extra
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCK) {
    const { mockRequest } = await import('./mock')
    return mockRequest<T>(path, init)
  }
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { 'X-API-Token': TOKEN } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new AppError('NETWORK_ERROR', 'مفيش اتصال بالسيرفر')
  }
  const text = await res.text()
  const body = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const e = body?.error
    throw new AppError(e?.code ?? 'HTTP_ERROR', e?.message ?? `خطأ ${res.status}`, e ?? {})
  }
  return body as T
}

const post = <T>(p: string, body?: unknown) =>
  req<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  sessions: () => req<{ sessions: SessionRow[] }>('/api/sessions'),
  session: (id: number) => req<SessionRow & { run: Run | null }>(`/api/sessions/${id}`),
  attendance: (id: number) =>
    req<{ session: SessionRow; records: AttendanceRecord[] }>(`/api/sessions/${id}/attendance`),
  run: (id: number) => req<{ run: Run | null }>(`/api/sessions/${id}/run`),
  closeSession: (id: number) =>
    post<{ run_id: string | null; status: string; session_id: number }>(`/api/sessions/${id}/close`),

  pendingReviews: (sessionId?: number) =>
    req<{ sessions: ReviewSession[]; reviews: ReviewItem[] }>(
      `/api/reviews/pending${sessionId ? `?session_id=${sessionId}` : ''}`),
  confirmReview: (id: number, traineeId: number) =>
    post<{ ok: boolean; remaining: number; alias_saved: boolean; trainee: string }>(
      `/api/reviews/${id}/confirm`, { trainee_id: traineeId }),
  rejectReview: (id: number) =>
    post<{ ok: boolean; remaining: number }>(`/api/reviews/${id}/reject`),

  approvals: (status = 'pending') =>
    req<{ approvals: Approval[] }>(`/api/approvals?status=${status}`),
  approval: (id: number) => req<Approval>(`/api/approvals/${id}`),
  approve: (id: number) => post<{ id: number; status: string }>(`/api/approvals/${id}/approve`),
  reject: (id: number, reason?: string) =>
    post<{ id: number; status: string }>(`/api/approvals/${id}/reject`, { reason }),
  patchApproval: (id: number, edited: Record<string, unknown>) =>
    req<Approval>(`/api/approvals/${id}/payload`,
      { method: 'PATCH', body: JSON.stringify({ edited_content: edited }) }),

  priorities: (top = 3) =>
    req<{ top: Priority[]; all: Priority[] }>(`/api/dashboard/priorities?top=${top}`),
  summary: () => req<Summary>('/api/dashboard/summary'),
  charts: (programId?: number) =>
    req<Charts>(`/api/dashboard/charts${programId ? `?program_id=${programId}` : ''}`),
  timeline: (id: number) =>
    req<{ trainee: { id: number; name_ar: string; email: string | null; zoom_aliases: string[] }
      timeline: TimelineItem[] }>(`/api/trainees/${id}/timeline`),
  activity: (params = '') => req<{ activity: ActivityItem[] }>(`/api/activity${params}`),
  command: (text: string, choice?: Record<string, unknown>) =>
    post<CommandReply>('/api/command', { text, choice }),
}

export const wsUrl = () => {
  const base = BASE || window.location.origin
  return `${base.replace(/^http/, 'ws')}/api/ws`
}
