import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewSession from './pages/NewSession'
import Diagnosis from './pages/Diagnosis'
import GuidedFix from './pages/GuidedFix'
import Verification from './pages/Verification'
import History from './pages/History'
import SettingsPage from './pages/Settings'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewSession />} />
          <Route path="session/:id/diagnosis" element={<Diagnosis />} />
          <Route path="session/:id/fix" element={<GuidedFix />} />
          <Route path="session/:id/verify" element={<Verification />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
