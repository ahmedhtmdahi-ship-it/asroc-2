export type Status =
  | 'present' | 'late' | 'partial' | 'absent' | 'early_leave' | 'needs_review'

export interface ApiError { error: { code: string; message: string; [k: string]: unknown } }

export interface SessionRow {
  id: number; title: string; status: string; program_id: number; program: string | null
  date: string; date_ar: string; planned_start: string | null; planned_end: string | null
  planned_minutes: number; zoom_meeting_id: string | null; closed_at: string | null
}

export interface WorkflowEvent {
  at: string; kind: string; step: string | null
  detail?: string; reason?: string; message?: string; error?: string
}

export interface Run {
  run_id: string; definition: string; status: string; current_step: string | null
  pause_reason: string | null; resume_token: string | null; completed_steps: string[]
  steps: { name: string; label: string }[]; error: string | null
  events: WorkflowEvent[]; session_id: number | null
  context: Record<string, unknown>; updated_at: string | null
}

export interface AttendanceRecord {
  id: number; trainee_id: number | null; name: string; zoom_name: string | null
  email: string | null; minutes: number; percentage: number; status: Status
  flags: string[]; disconnects: number; first_join: string | null; last_leave: string | null
  merged_intervals: [string, string][]; match_method: string | null
  match_confidence: number; needs_review: boolean; excluded: boolean
}

export interface Suggestion {
  trainee_id: number; score: number; reason: string; name_ar: string; email: string | null
}

export interface ReviewItem {
  review_id: number; session_id: number; zoom_name: string | null; zoom_email: string | null
  total_minutes: number; merged_intervals: [string, string][]
  merged_intervals_iso: [string, string][]; disconnects: number
  suggestions: Suggestion[]; match_method: string | null
}

export interface ReviewSession {
  id: number; title: string; program: string; date: string
  planned_start: string; planned_end: string; planned_minutes: number
  stats: { auto_matched: number; needs_review: number; unmatched: number }
  roster: { trainee_id: number; name_ar: string; name_en: string | null; email: string | null }[]
}

export interface SheetPreviewRow {
  trainee_id: number; name: string; minutes: number; percentage: number; status: Status
}

export interface MessagePreview {
  message_id: number; trainee_id: number; name: string; email: string | null
  type: string; subject: string | null; body: string; excluded?: boolean
}

export interface ApprovalPreview {
  summary: string; session_id?: number; session_title?: string
  sheet_id?: string; tab?: string; column?: string
  counts?: Record<string, number>; rows?: SheetPreviewRow[]
  recipient_count?: number; channel?: string; send_enabled?: boolean
  messages?: MessagePreview[]
}

export interface Approval {
  id: number; type: 'update_sheet' | 'send_messages' | string; status: string
  preview: ApprovalPreview
  payload: { session_id?: number; stage?: string; messages?: MessagePreview[] } | null
  created_at: string | null; expires_at: string; decided_by: string | null
  decided_at: string | null; reject_reason: string | null; workflow_run_id: string | null
}

export interface Priority {
  id: string; title: string; kind: string; score: number; rank: number
  reasoning: string; reasons: string[]; action_label: string; action_url: string
  affected: number; session_id?: number; approval_id?: number; command?: string
}

export interface Summary {
  greeting_date: string
  today_sessions: { id: number; title: string; status: string; time: string | null }[]
  followups: {
    no_feedback: number; low_attendance: number; pending_reviews: number
    pending_approvals: number; unclosed_sessions: number
  }
  programs: { id: number; name: string }[]
}

export interface Charts {
  attendance: { session: string; rate: number }[]
  statuses: Record<string, string | number>[]
  feedback: { sent: number; replied: number; rate: number }
}

export interface TimelineItem {
  at: string | null; date: string; kind: string; status: string; text: string
}

export interface ActivityItem {
  id: number; at: string | null; time: string | null; actor: string; action: string
  target: string | null; result: string; error: string | null; duration_ms: number | null
  before: unknown; after: unknown; workflow_run_id: string | null
}

export interface CommandReply {
  text: string; intent: string; entities: Record<string, unknown>; confidence: number
  clarification: { question: string; options: { session_id: number; label: string }[] } | null
  action: {
    type: string; run_id?: string | null; session_id?: number; approval_id?: number
    message?: string; brief?: { text: string }; results?: unknown[]
  } | null
}

export interface WsEvent {
  kind: 'workflow' | 'approval' | 'review' | 'session' | 'brief' | 'hello'
  [k: string]: unknown
}
