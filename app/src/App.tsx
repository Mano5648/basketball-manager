import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Teams from './pages/Teams'
import Fixtures from './pages/Fixtures'
import Contact from './pages/Contact'
import ManagerLogin from './pages/ManagerLogin'
import ManagerDashboard from './pages/ManagerDashboard'
import PlayerLogin from './pages/PlayerLogin'
import Store from './pages/Store'
import PlayerDashboard from './pages/PlayerDashboard'
import PaymentSuccess, { PaymentCancel } from './pages/PaymentSuccess'
import ResetPassword from './pages/ResetPassword'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/fixtures" element={<Fixtures />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/store" element={<Layout><Store /></Layout>} />
      <Route path="/payment/success" element={<Layout><PaymentSuccess /></Layout>} />
      <Route path="/payment/cancel" element={<Layout><PaymentCancel /></Layout>} />
      <Route path="/manager/login" element={<ManagerLogin />} />
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute role="manager">
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/player/login" element={<PlayerLogin />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/player/dashboard"
        element={
          <ProtectedRoute>
            <PlayerDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
