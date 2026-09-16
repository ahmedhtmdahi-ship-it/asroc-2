import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApprovalDetail } from '../screens/Approvals'

// vi.mock is hoisted above imports — the spies and fixture must be hoisted with it
const { approve, reject, patchApproval } = vi.hoisted(() => ({
  approve: vi.fn(), reject: vi.fn(), patchApproval: vi.fn(),
}))

const messages = [
  { message_id: 500, trainee_id: 7, name: 'يوسف إبراهيم', email: 'y@x.com', type: 'absence',
    subject: 'غيابك عن جلسة React', body: 'أهلاً يوسف،', excluded: false },
  { message_id: 501, trainee_id: 8, name: 'سارة عبدالله', email: 's@x.com', type: 'partial',
    subject: 'حضورك الجزئي', body: 'أهلاً سارة،', excluded: false },
  { message_id: 502, trainee_id: 9, name: 'زياد وائل', email: 'z@x.com', type: 'partial',
    subject: 'حضورك الجزئي', body: 'أهلاً زياد،', excluded: false },
]

const approval = {
  id: 301, type: 'send_messages', status: 'pending',
  preview: {
    summary: '3 رسائل متابعة — React', session_id: 412, recipient_count: 3,
    channel: 'email', send_enabled: true, messages,
  },
  payload: { session_id: 412, stage: 'messages', messages },
  created_at: '2026-08-17T20:15:00', expires_at: new Date(Date.now() + 72 * 3600e3).toISOString(),
  decided_by: null, decided_at: null, reject_reason: null, workflow_run_id: 'r1',
}

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    USE_MOCK: false,
    api: {
      approval: async () => JSON.parse(JSON.stringify(approval)),
      approve, reject, patchApproval,
    },
  }
})

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/approvals/301']}>
    <Routes><Route path="/approvals/:id" element={<ApprovalDetail />} /></Routes>
  </MemoryRouter>,
)

describe('Approval detail', () => {
  beforeEach(() => {
    approve.mockReset()
    reject.mockReset().mockResolvedValue({ id: 301, status: 'rejected' })
    patchApproval.mockReset().mockImplementation(async () =>
      JSON.parse(JSON.stringify(approval)))
  })

  it('states the impact and lists every message, not a sample', async () => {
    renderDetail()
    expect(await screen.findByText(/هيتبعت/)).toBeInTheDocument()
    expect(screen.getByText('يوسف إبراهيم')).toBeInTheDocument()
    expect(screen.getByText('سارة عبدالله')).toBeInTheDocument()
    expect(screen.getByText('زياد وائل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ابعت 3 رسالة/ })).toBeInTheDocument()
  })

  it('excluding a recipient updates the count and the button', async () => {
    renderDetail()
    const box = await screen.findByLabelText('ابعت لـ يوسف إبراهيم')
    fireEvent.click(box)
    expect(await screen.findByRole('button', { name: /ابعت 2 رسالة/ })).toBeInTheDocument()
  })

  it('excluding everyone disables sending', async () => {
    renderDetail()
    for (const name of ['يوسف إبراهيم', 'سارة عبدالله', 'زياد وائل']) {
      fireEvent.click(await screen.findByLabelText(`ابعت لـ ${name}`))
    }
    expect(await screen.findByText(/مش هيتبعت أي حاجة/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ابعت 0 رسالة/ })).toBeDisabled()
  })

  it('double-click sends exactly one approve call and shows no optimistic result', async () => {
    let release!: () => void
    approve.mockImplementation(() => new Promise(res => {
      release = () => res({ id: 301, status: 'executed' })
    }))
    renderDetail()
    const btn = await screen.findByRole('button', { name: /ابعت 3 رسالة/ })
    fireEvent.click(btn)
    const busy = await screen.findByRole('button', { name: 'بينفّذ…' })
    expect(busy).toBeDisabled()
    fireEvent.click(busy)
    fireEvent.click(busy)
    expect(approve).toHaveBeenCalledTimes(1)
    // nothing is claimed as done until the server answers
    expect(screen.queryByText(/اتنفذ/)).not.toBeInTheDocument()
    release()
    await waitFor(() => expect(screen.getByText(/✓ اتنفذ/)).toBeInTheDocument())
  })

  it('saves edits with the approval so the edited body is what gets sent', async () => {
    approve.mockResolvedValue({ id: 301, status: 'executed' })
    renderDetail()
    fireEvent.click((await screen.findAllByText('اعرض'))[0])
    fireEvent.click(await screen.findByText('عدّل'))
    fireEvent.change(await screen.findByLabelText('نص الرسالة'), { target: { value: 'نص معدّل' } })
    fireEvent.click(screen.getByRole('button', { name: /ابعت 3 رسالة/ }))
    await waitFor(() => expect(patchApproval).toHaveBeenCalled())
    const sent = patchApproval.mock.calls[0][1] as { messages: { body: string }[] }
    expect(sent.messages[0].body).toBe('نص معدّل')
    expect(approve).toHaveBeenCalledTimes(1)
  })

  it('rejects with a reason', async () => {
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'ارفض' }))
    fireEvent.change(await screen.findByPlaceholderText('سبب الرفض (اختياري)'),
      { target: { value: 'الشيت مش جاهز' } })
    fireEvent.click(screen.getByRole('button', { name: 'أكّد الرفض' }))
    await waitFor(() => expect(reject).toHaveBeenCalledWith(301, 'الشيت مش جاهز'))
  })
})
