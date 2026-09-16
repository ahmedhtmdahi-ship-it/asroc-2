import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Review } from '../screens/Review'

// vi.mock is hoisted above imports — the spies must be hoisted with it
const { confirmReview, rejectReview } = vi.hoisted(() => ({
  confirmReview: vi.fn(), rejectReview: vi.fn(),
}))

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    USE_MOCK: false,
    api: {
      pendingReviews: async () => ({
        sessions: [{
          id: 412, title: 'React', program: 'React', date: '17 أغسطس',
          planned_start: '18:00', planned_end: '20:00', planned_minutes: 120,
          stats: { auto_matched: 21, needs_review: 2, unmatched: 0 },
          roster: [
            { trainee_id: 2, name_ar: 'أحمد محمود حسن', name_en: 'Ahmed Mahmoud', email: 'a@x.com' },
            { trainee_id: 3, name_ar: 'أحمد مصطفى', name_en: 'Ahmed Mostafa', email: 'b@x.com' },
            { trainee_id: 9, name_ar: 'مريم خالد', name_en: 'Mariam', email: 'm@x.com' },
          ],
        }],
        reviews: [
          {
            review_id: 88, session_id: 412, zoom_name: 'احمد م.', zoom_email: null,
            total_minutes: 96, merged_intervals: [['18:03', '19:12'], ['19:20', '19:47']],
            merged_intervals_iso: [], disconnects: 1, match_method: 'fuzzy',
            suggestions: [
              { trainee_id: 2, score: 0.88, reason: 'token_set', name_ar: 'أحمد محمود حسن', email: null },
              { trainee_id: 3, score: 0.84, reason: 'translit', name_ar: 'أحمد مصطفى', email: null },
            ],
          },
          {
            review_id: 89, session_id: 412, zoom_name: 'Zoom User', zoom_email: null,
            total_minutes: 12, merged_intervals: [['18:00', '18:12']], merged_intervals_iso: [],
            disconnects: 0, match_method: 'none', suggestions: [],
          },
        ],
      }),
      confirmReview,
      rejectReview,
    },
  }
})

const renderReview = () => render(
  <MemoryRouter initialEntries={['/review/412']}>
    <Routes><Route path="/review/:sessionId" element={<Review />} /></Routes>
  </MemoryRouter>,
)

describe('Review screen', () => {
  beforeEach(() => {
    confirmReview.mockReset().mockResolvedValue({ ok: true, remaining: 1, alias_saved: true,
      trainee: 'أحمد محمود حسن' })
    rejectReview.mockReset().mockResolvedValue({ ok: true, remaining: 1 })
  })

  it('shows the candidates and warns when the top two are within 10%', async () => {
    renderReview()
    await screen.findByText('احمد م.')
    expect(screen.getByText('أحمد محمود حسن')).toBeInTheDocument()
    // 0.88 - 0.84 = 4% → the dangerous case
    expect(screen.getByText(/الفرق بين أول اتنين/)).toBeInTheDocument()
  })

  it('confirms with the number keys', async () => {
    renderReview()
    await screen.findByText('احمد م.')
    fireEvent.keyDown(window, { key: '2' })
    await waitFor(() => expect(confirmReview).toHaveBeenCalledWith(88, 3))
  })

  it('confirms the first candidate with Enter and reports the saved alias', async () => {
    renderReview()
    await screen.findByText('احمد م.')
    fireEvent.keyDown(window, { key: 'Enter' })
    await waitFor(() => expect(confirmReview).toHaveBeenCalledWith(88, 2))
    expect(await screen.findByText(/اتحفظ: «احمد م.» = أحمد محمود حسن/)).toBeInTheDocument()
  })

  it('X marks the row as not a trainee', async () => {
    renderReview()
    await screen.findByText('احمد م.')
    fireEvent.keyDown(window, { key: 'x' })
    await waitFor(() => expect(rejectReview).toHaveBeenCalledWith(88))
  })

  it('/ opens manual roster search and confirms from it', async () => {
    renderReview()
    await screen.findByText('احمد م.')
    fireEvent.keyDown(window, { key: '/' })
    const input = await screen.findByPlaceholderText('دوّر في الروستر…')
    fireEvent.change(input, { target: { value: 'مريم' } })
    fireEvent.click(await screen.findByText('مريم خالد'))
    await waitFor(() => expect(confirmReview).toHaveBeenCalledWith(88, 9))
  })

  it('tells the operator when there is no plausible candidate', async () => {
    renderReview()
    expect(await screen.findByText(/مفيش مرشحين قريبين/)).toBeInTheDocument()
  })
})
