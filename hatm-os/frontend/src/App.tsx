import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { USE_MOCK } from './api/client'
import { Activity } from './screens/Activity'
import { ApprovalDetail, ApprovalInbox } from './screens/Approvals'
import { MissionControl } from './screens/MissionControl'
import { Review } from './screens/Review'
import { SessionView } from './screens/SessionView'
import { TraineeTimeline } from './screens/Trainee'

const CRUMB: [RegExp, string][] = [
  [/^\/review/, 'مراجعة الأسماء'],
  [/^\/approvals\/\d+/, 'موافقة'],
  [/^\/approvals/, 'الموافقات'],
  [/^\/sessions/, 'جلسة'],
  [/^\/trainees/, 'متدرب'],
  [/^\/activity/, 'سجل النشاط'],
]

export default function App() {
  const { pathname } = useLocation()
  const crumb = CRUMB.find(([re]) => re.test(pathname))?.[1] ?? 'الرئيسية'

  return (
    <div className="app">
      <header className="top">
        <Link className="brand" to="/">حوتمة <small>HATM OS</small></Link>
        <div className="faint">
          {crumb}
          {USE_MOCK && <span className="pill grey" style={{ marginInlineStart: 8 }}>mock</span>}
          <Link to="/activity" style={{ marginInlineStart: 10, fontSize: 12 }}>السجل</Link>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<MissionControl />} />
          <Route path="/review" element={<Review />} />
          <Route path="/review/:sessionId" element={<Review />} />
          <Route path="/sessions/:id" element={<SessionView />} />
          <Route path="/approvals" element={<ApprovalInbox />} />
          <Route path="/approvals/:id" element={<ApprovalDetail />} />
          <Route path="/trainees/:id" element={<TraineeTimeline />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
