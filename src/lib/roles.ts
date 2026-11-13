import { ApiError } from '@/lib/api-error'
import { hasPermission, inviteableFrontendRoles } from '@/lib/permissions'
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
  return hasPermission(role, 'users.read')
}

export function canCreateAdminUsers(role: UserRole | undefined) {
  return hasPermission(role, 'users.create')
}

export function canUpdateAdminUsers(role: UserRole | undefined) {
  return hasPermission(role, 'users.update')
}

export function canInviteAdminUsers(role: UserRole | undefined) {
  return hasPermission(role, 'users.invite')
}

export function canChangeAdminRoleOrActive(role: UserRole | undefined) {
  return hasPermission(role, 'users.roles.manage')
}

export function canDeactivateUsers(role: UserRole | undefined) {
  return hasPermission(role, 'users.deactivate')
}

export function canManageAdminAccount(actorRole: UserRole | undefined, target: { role: UserRole }) {
  if (actorRole === 'owner') return true
  if (actorRole === 'admin') return target.role !== 'owner'
  if (actorRole === 'manager') return target.role === 'receptionist'
  return false
}

export function canManageAccommodations(role: UserRole | undefined) {
  return hasPermission(role, 'accommodations.write')
}

export function canManageRoomAvailability(role: UserRole | undefined) {
  return hasPermission(role, 'accommodations.availability')
}

export function canResetStaffPasswords(role: UserRole | undefined) {
  return hasPermission(role, 'users.password')
}

export function canRevokeStaffSessions(role: UserRole | undefined) {
  return hasPermission(role, 'users.sessions')
}

export function canManageRates(role: UserRole | undefined) {
  return hasPermission(role, 'pricing.update')
}

export function canManageAdminServices(role: UserRole | undefined) {
  return hasPermission(role, 'services.update')
}

export function canReassignBookingRoom(role: UserRole | undefined) {
  return hasPermission(role, 'bookings.reassign')
}

export function canWriteGuests(role: UserRole | undefined) {
  return hasPermission(role, 'guests.update')
}

export function canExportGuests(role: UserRole | undefined) {
  return hasPermission(role, 'guests.export')
}

export function canImportGuests(role: UserRole | undefined) {
  return hasPermission(role, 'guests.import')
}

export function canReadAnalytics(role: UserRole | undefined) {
  return hasPermission(role, 'analytics.read')
}

export function canReadAudit(role: UserRole | undefined) {
  return hasPermission(role, 'audit.read')
}

export function canExportAudit(role: UserRole | undefined) {
  return hasPermission(role, 'audit.export')
}

export function canCancelBookings(role: UserRole | undefined) {
  return hasPermission(role, 'bookings.cancel')
}

export function canInviteRole(actor: UserRole | undefined, target: UserRole) {
  return (inviteableFrontendRoles(actor) as UserRole[]).includes(target)
}

function isBackendAdminRole(role: string): role is BackendAdminRole {
  return Object.prototype.hasOwnProperty.call(backendRoleToFrontend, role)
}
