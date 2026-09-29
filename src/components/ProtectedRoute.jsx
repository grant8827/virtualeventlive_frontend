import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// `role` is one role or a list of allowed roles.
export default function ProtectedRoute({ children, role, redirectTo = '/' }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const allowed = Array.isArray(role) ? role : role ? [role] : null
  if (allowed && !allowed.includes(user.role)) return <Navigate to={redirectTo} replace />
  return children
}
