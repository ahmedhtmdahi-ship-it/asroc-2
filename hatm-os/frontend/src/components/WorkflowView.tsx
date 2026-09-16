import type { Run } from '../api/types'
import { PAUSE_AR, RUN_STATUS_AR } from '../lib/format'

/** Live view of a workflow run: which step it's on, what it's waiting for. */
export function WorkflowView({ run }: { run: Run }) {
  const done = new Set(run.completed_steps)
  const detailOf = (step: string) => {
    const ev = [...run.events].reverse().find(e => e.step === step && e.kind === 'step_done')
    return ev?.detail ?? ''
  }

  const cls = (name: string) => {
    if (done.has(name)) return 'step on done'
    if (run.current_step === name) {
      if (run.status === 'failed') return 'step on fail'
      if (run.status === 'running') return 'step on run'
      return 'step on wait'
    }
    return 'step'
  }
  const icon = (name: string) => {
    if (done.has(name)) return '✓'
    if (run.current_step === name && run.status === 'failed') return '×'
    if (run.current_step === name && run.status !== 'running') return '!'
    return ''
  }

  return (
    <div>
      <div className="row">
        <span className="muted">{RUN_STATUS_AR[run.status] ?? run.status}</span>
        {run.pause_reason && (
          <span className="pill amber">{PAUSE_AR[run.pause_reason] ?? run.pause_reason}</span>
        )}
      </div>
      {run.error && <div className="err" role="alert">{run.error}</div>}
      <div className="wf">
        {run.steps.map(s => (
          <div className={cls(s.name)} key={s.name}>
            <span className="ic">{icon(s.name)}</span>
            <span className="lab">{s.label}</span>
            <span className="det">{detailOf(s.name)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
