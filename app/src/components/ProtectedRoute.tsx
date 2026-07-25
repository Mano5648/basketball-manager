import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth, type Role } from '@/lib/AuthContext'

// Gates a route behind authentication. When `role` is given, the user must
// also hold that role (managers can view player pages, but not vice versa).
export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode
  role?: Role
}) {
  const { user, role: userRole, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#f3f2ec' }}>
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={role === 'manager' ? '/manager/login' : '/player/login'} replace />
  }

  if (role === 'manager' && userRole !== 'manager') {
    return <Navigate to="/manager/login" replace />
  }

  return <>{children}</>
}
