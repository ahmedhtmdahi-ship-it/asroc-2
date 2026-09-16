import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Charts as ChartsData } from '../api/types'

/**
 * Colours come from CSS custom properties so light/dark are selected, not flipped.
 * Line   → categorical slot 1 (single series, so the title names it: no legend).
 * Stack  → the reserved status palette; these segments mean good/partial/absent,
 *          so they always carry a legend label and a table view (the warning step
 *          is sub-3:1 on the light surface by design — labels are the relief).
 */
const AXIS = { fontSize: 11, fill: 'var(--viz-muted)' }

function TipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="tip" dir="rtl">
      <b>{title}</b>
      {rows.map(([k, v]) => (
        <div className="r" key={k}><span>{k}</span><span className="num">{v}</span></div>
      ))}
    </div>
  )
}

export function AttendanceTrend({ data }: { data: ChartsData['attendance'] }) {
  if (data.length < 2) return null
  return (
    <div className="chart">
      <div className="chart-title">نسبة الحضور عبر الجلسات</div>
      <div className="chart-sub">نسبة اللي حضروا ٨٠٪ أو أكتر من كل جلسة</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 14, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="var(--viz-grid)" strokeWidth={1} vertical={false} />
          <XAxis dataKey="session" tick={AXIS} tickLine={false} reversed
                 axisLine={{ stroke: 'var(--viz-axis)' }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} width={34} tick={AXIS} tickLine={false} axisLine={false}
                 orientation="right" tickFormatter={v => `${v}%`} />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length
                ? <TipBox title={String(label)} rows={[['نسبة الحضور', `${payload[0].value}%`]]} />
                : null}
          />
          <Line
            type="monotone" dataKey="rate" stroke="var(--viz-series-1)" strokeWidth={2}
            dot={{ r: 4, fill: 'var(--viz-series-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={{ r: 5 }} isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const SEGMENTS: [string, string, string][] = [
  ['present', 'حاضر', 'var(--viz-good)'],
  ['partial', 'جزئي', 'var(--viz-warning)'],
  ['absent', 'غايب', 'var(--viz-critical)'],
]

/** `late` / `early_leave` sit at the present attendance level — folded in here;
 *  the per-person detail stays in the session table. */
function fold(rows: ChartsData['statuses']) {
  return rows.map(r => ({
    session: String(r.session),
    present: Number(r.present ?? 0) + Number(r.late ?? 0) + Number(r.early_leave ?? 0),
    partial: Number(r.partial ?? 0),
    absent: Number(r.absent ?? 0),
  }))
}

export function StatusBreakdown({ data }: { data: ChartsData['statuses'] }) {
  const [asTable, setAsTable] = useState(false)
  if (!data.length) return null
  const rows = fold(data)

  return (
    <div className="chart">
      <div className="row">
        <div>
          <div className="chart-title">توزيع الحالات لكل جلسة</div>
          <div className="chart-sub">عدد المتدربين في كل حالة</div>
        </div>
        <button className="tg" style={{ background: 'none', color: 'var(--brand)', padding: 0,
                                         fontSize: 12 }}
                onClick={() => setAsTable(v => !v)}>
          {asTable ? 'رسم' : 'جدول'}
        </button>
      </div>

      {asTable ? (
        <table>
          <thead>
            <tr><th>الجلسة</th>{SEGMENTS.map(([k, label]) => <th key={k}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.session}>
                <td>{r.session}</td>
                {SEGMENTS.map(([k]) => (
                  <td className="num" key={k}>{r[k as 'present' | 'partial' | 'absent']}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 4, left: 8 }} barSize={22}>
            <CartesianGrid stroke="var(--viz-grid)" strokeWidth={1} vertical={false} />
            <XAxis dataKey="session" tick={AXIS} tickLine={false} reversed
                   axisLine={{ stroke: 'var(--viz-axis)' }} interval="preserveStartEnd" />
            <YAxis width={28} tick={AXIS} tickLine={false} axisLine={false} orientation="right"
                   allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'var(--bg)' }}
              content={({ active, payload, label }) =>
                active && payload?.length
                  ? <TipBox title={String(label)} rows={payload.map(p => [
                      SEGMENTS.find(s => s[0] === p.dataKey)?.[1] ?? String(p.dataKey),
                      String(p.value)])} />
                  : null}
            />
            {SEGMENTS.map(([key, , color], i) => (
              <Bar
                key={key} dataKey={key} stackId="s" fill={color} name={key}
                isAnimationActive={false}
                stroke="var(--surface)" strokeWidth={2}
                radius={i === SEGMENTS.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="legend">
        {SEGMENTS.map(([k, label, color]) => (
          <span key={k}><i style={{ background: color }} />{label}</span>
        ))}
      </div>
    </div>
  )
}

/** One current number — a stat tile reads better than a chart for a single value. */
export function FeedbackRate({ data }: { data: ChartsData['feedback'] }) {
  if (!data.sent) return null
  return (
    <div className="chart">
      <div className="chart-title">الرد على الـ Feedback</div>
      <div className="hero num">{data.rate}%</div>
      <div className="chart-sub">
        <span className="num">{data.replied}</span> ردوا من{' '}
        <span className="num">{data.sent}</span> اتبعتلهم
      </div>
      <div className="meter"><i style={{ width: `${data.rate}%` }} /></div>
    </div>
  )
}
