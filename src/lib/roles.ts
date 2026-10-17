import { ApiError } from '@/lib/api-error'
import type { UserRole } from '@/types'

export const backendRoleToFrontend = {
  SUPER_ADMIN: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  RECEPTIONIST: 'receptionist',
} as const satisfies Record<string, UserRole>

export type BackendAdminRole = keyof typeof backendRoleToFrontend

export const frontendRoleToBackend = {
  owner: 'SUPER_ADMIN',
  admin: 'ADMIN',
  manager: 'MANAGER',
  receptionist: 'RECEPTIONIST',
} as const satisfies Record<UserRole, BackendAdminRole>

export function mapBackendRole(role: string): UserRole {
  if (isBackendAdminRole(role)) return backendRoleToFrontend[role]
  throw new ApiError('Невідома роль користувача', 0, 'UNKNOWN_ROLE')
}

export function mapFrontendRole(role: UserRole): BackendAdminRole {
  return frontendRoleToBackend[role]
}

export function canAccessUsersManagement(role: UserRole | undefined) {
  return role === 'owner' || role === 'admin'
}

export function canCreateAdminUsers(role: UserRole | undefined) {
  return role === 'owner'
}

export function canChangeAdminRoleOrActive(role: UserRole | undefined) {
  return role === 'owner'
}

/** Mirrors backend assertAdminMayTouchAccount: ADMIN cannot modify SUPER_ADMIN accounts. */
export function canManageAdminAccount(actorRole: UserRole | undefined, target: { role: UserRole }) {
  if (actorRole === 'owner') return true
  if (actorRole === 'admin') return target.role !== 'owner'
  return false
}

/** Mirrors accommodation WRITE_ROLES: SUPER_ADMIN + ADMIN. All staff roles may read. */
export function canManageAccommodations(role: UserRole | undefined) {
  return role === 'owner' || role === 'admin'
}

/** Mirrors rates WRITE_ROLES: SUPER_ADMIN + ADMIN. Manager/receptionist may read. */
export function canManageRates(role: UserRole | undefined) {
  return role === 'owner' || role === 'admin'
}

/** Mirrors booking REASSIGN_ROLES: SUPER_ADMIN + ADMIN + MANAGER. */
export function canReassignBookingRoom(role: UserRole | undefined) {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

function isBackendAdminRole(role: string): role is BackendAdminRole {
  return Object.prototype.hasOwnProperty.call(backendRoleToFrontend, role)
}
