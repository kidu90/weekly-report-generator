import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageSkeleton } from '@/components/feedback/PageSkeleton'

type ProtectedRouteProps = {
  role?: 'Manager' | 'TeamMember' | 'any'
}

export function ProtectedRoute({ role = 'any' }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <PageSkeleton />
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  if (role !== 'any' && user.role !== role) {
    return <Navigate to="/auth/unauthorized" replace />
  }

  return <Outlet />
}