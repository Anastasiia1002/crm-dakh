import { ApiError } from '@/lib/api-error'
import type { UserRole } from '@/types'

export const backendRoleToFrontend = {
  SUPER_ADMIN: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  RECEPTIONIST: 'receptionist',
} as const satisfies Record<string, UserRole>

export type BackendAdminRole = keyof typeof backendRoleToFrontend

export function mapBackendRole(role: string): UserRole {
  if (isBackendAdminRole(role)) return backendRoleToFrontend[role]
  throw new ApiError('Невідома роль користувача', 0, 'UNKNOWN_ROLE')
}

function isBackendAdminRole(role: string): role is BackendAdminRole {
  return Object.prototype.hasOwnProperty.call(backendRoleToFrontend, role)
}
