import LandingPage from '@/pages/Landing'
import DashboardPage from '@/pages/Dashboard'
import { useJobMonitor } from '@/hooks/useJobMonitor'
import TerminalPage from '@/pages/Terminal'
import WorkspacePage from '@/pages/Workspace'
import { Navigate, Route, Routes } from 'react-router-dom'

function App() {
  const { startJob, statusData } = useJobMonitor()

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage startJob={startJob} statusData={statusData} />} />
      <Route path="/terminal" element={<TerminalPage statusData={statusData} />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
