import { Navigate, useLocation } from 'react-router-dom'
import { auditLegacyRedirectPath } from '@/lib/users-page-tabs'

export function AuditPage() {
  const location = useLocation()
  return <Navigate to={auditLegacyRedirectPath(location.search)} replace />
}
