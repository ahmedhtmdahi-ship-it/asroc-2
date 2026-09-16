import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttendanceTrend, FeedbackRate, StatusBreakdown } from '../components/Charts'

const statuses = [
  { session: 'React 08-03', present: 16, late: 2, partial: 3, absent: 3 },
  { session: 'React 08-10', present: 15, late: 0, partial: 5, absent: 4 },
]

describe('Charts', () => {
  it('labels every status segment — identity is never colour alone', () => {
    render(<StatusBreakdown data={statuses} />)
    for (const label of ['حاضر', 'جزئي', 'غايب']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('offers a table view as the relief for the sub-3:1 warning colour', () => {
    render(<StatusBreakdown data={statuses} />)
    fireEvent.click(screen.getByText('جدول'))
    // late folds into the present level; the per-person detail lives in the session table
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('names the single line series in the title instead of a legend box', () => {
    render(<AttendanceTrend data={[{ session: 'a', rate: 80 }, { session: 'b', rate: 71 }]} />)
    expect(screen.getByText('نسبة الحضور عبر الجلسات')).toBeInTheDocument()
  })

  it('renders one number as a stat tile, not a chart', () => {
    render(<FeedbackRate data={{ sent: 40, replied: 22, rate: 55 }} />)
    expect(screen.getByText('55%')).toBeInTheDocument()
  })

  it('renders nothing when there is not enough data for a trend', () => {
    const { container } = render(<AttendanceTrend data={[{ session: 'a', rate: 80 }]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
