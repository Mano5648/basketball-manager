import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Teams from './pages/Teams'
import Fixtures from './pages/Fixtures'
import Contact from './pages/Contact'
import ManagerLogin from './pages/ManagerLogin'
import ManagerDashboard from './pages/ManagerDashboard'
import PlayerLogin from './pages/PlayerLogin'
import Store from './pages/Store'
import PlayerDashboard from './pages/PlayerDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/fixtures" element={<Fixtures />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/store" element={<Layout><Store /></Layout>} />
      <Route path="/manager/login" element={<ManagerLogin />} />
      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      <Route path="/player/login" element={<PlayerLogin />} />
      <Route path="/player/dashboard" element={<PlayerDashboard />} />
    </Routes>
  )
}
