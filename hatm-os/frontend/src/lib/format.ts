import type { Status } from '../api/types'

export const STATUS_AR: Record<string, string> = {
  present: 'حاضر', late: 'متأخر', partial: 'جزئي', absent: 'غايب',
  early_leave: 'خرج بدري', needs_review: 'للمراجعة',
}

export const STATUS_PILL: Record<string, string> = {
  present: 'green', late: 'amber', partial: 'amber', absent: 'red',
  early_leave: 'amber', needs_review: 'grey',
}

export const FLAG_AR: Record<string, string> = {
  late: 'متأخر', early_leave: 'خرج بدري', many_disconnects: 'انقطاعات كتير',
  needs_review: 'محتاج مراجعة', invalid_basis: 'مدة الجلسة غلط',
}

export const RUN_STATUS_AR: Record<string, string> = {
  running: 'شغال', paused: 'متوقف', awaiting_approval: 'مستني موافقتك',
  completed: 'خلص', failed: 'فشل', cancelled: 'اتلغى',
}

export const PAUSE_AR: Record<string, string> = {
  needs_review: 'مستني مراجعة الأسماء',
  approval: 'مستني موافقتك',
  zoom_report_not_ready: 'تقرير Zoom لسه مش جاهز — بيحاول تاني كل ربع ساعة',
  retry: 'هيحاول تاني',
  zoom_instance_not_found: 'ملقاش اجتماع Zoom في التاريخ ده',
  zoom_meeting_missing: 'الجلسة مالهاش Zoom meeting id',
}

export const statusAr = (s: Status | string) => STATUS_AR[s] ?? s
export const statusPill = (s: Status | string) => STATUS_PILL[s] ?? 'grey'

/** "18:03" → minutes since midnight; used to place the attendance bars. */
export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600e3
}

export function expiryLabel(iso: string): { text: string; soon: boolean } {
  const h = hoursUntil(iso)
  if (h <= 0) return { text: 'انتهت صلاحية الموافقة', soon: true }
  if (h < 24) return { text: `بتنتهي خلال ${Math.max(1, Math.round(h))} ساعة`, soon: true }
  return { text: `صالحة ${Math.round(h / 24)} يوم كمان`, soon: false }
}

export function toCsv(rows: Record<string, unknown>[], headers: [string, string][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = headers.map(([, label]) => esc(label)).join(',')
  const body = rows.map(r => headers.map(([key]) => esc(r[key])).join(',')).join('\n')
  return `﻿${head}\n${body}`      // BOM so Excel reads Arabic correctly
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
