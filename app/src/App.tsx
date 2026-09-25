import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ErrorBoundary from './components/ErrorBoundary'
import AppShell from './components/AppShell'
import AdminShell from './components/AdminShell'
import { useAuth } from './lib/AuthContext'
import { LoginPage, RegisterPage, ForgotPage, ResetPasswordPage } from './pages/auth/AuthPages'
import HomeFeed, { NewsDetail } from './pages/member/HomeFeed'
import EventsPage, { EventDetail } from './pages/member/Events'
import FixturesPage, { FixtureDetail } from './pages/member/Fixtures'
import ShopPage, { CartPage } from './pages/member/Shop'
import MorePage, { InboxPage, SponsorsPage } from './pages/member/More'
import MembershipPage from './pages/member/Membership'
import LottoPage from './pages/member/Lotto'
import BookingsPage from './pages/member/Bookings'
import OrdersPage from './pages/member/Orders'
import ProfilePage from './pages/member/Profile'
import PaymentSuccess, { PaymentCancel, PrivacyPage } from './pages/PaymentResult'
import AdminDashboard from './pages/admin/Dashboard'
import { AdminNews, AdminEvents, AdminFixtures } from './pages/admin/Content'
import { AdminMembers, AdminTeams } from './pages/admin/People'
import { AdminMemberships, AdminLotto, AdminFacilities, AdminProducts, AdminSponsors } from './pages/admin/Commerce'
import { AdminOrders } from './pages/admin/Orders'
import { AdminNotifications } from './pages/admin/Notifications'
import { AdminSettings, AdminReports } from './pages/admin/Settings'

function Loading() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0C]"><Loader2 size={32} className="animate-spin text-lions-400" /></div>
}

function RequireAuth({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { user, role, loading } = useAuth()
  const loc = useLocation()
  if (loading || (user && !role)) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (admin && role !== 'manager') return <Navigate to="/app" replace />
  return <>{children}</>
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  const { user, role, loading } = useAuth()
  return (
    <ErrorBoundary>
      <ScrollTop />
      <Routes>
        <Route path="/" element={loading || (user && !role) ? <Loading /> : <Navigate to={user ? (role === 'manager' ? '/admin' : '/app') : '/login'} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<HomeFeed />} />
          <Route path="news/:id" element={<NewsDetail />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="fixtures" element={<FixturesPage />} />
          <Route path="fixtures/:id" element={<FixtureDetail />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="shop/cart" element={<CartPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="lotto" element={<LottoPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="sponsors" element={<SponsorsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/admin" element={<RequireAuth admin><AdminShell /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="fixtures" element={<AdminFixtures />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="memberships" element={<AdminMemberships />} />
          <Route path="lotto" element={<AdminLotto />} />
          <Route path="facilities" element={<AdminFacilities />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="sponsors" element={<AdminSponsors />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
