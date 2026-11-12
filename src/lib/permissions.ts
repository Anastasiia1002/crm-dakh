import type { UserRole } from '@/types'

/**
 * Mirrors dakh-backend `src/auth/permissions.ts`. Backend remains authoritative.
 * Unknown permissions are denied.
 */
export type Permission =
  | 'bookings.read'
  | 'bookings.create'
  | 'bookings.update'
  | 'bookings.cancel'
  | 'bookings.check_in'
  | 'bookings.reassign'
  | 'bookings.promo'
  | 'guests.read'
  | 'guests.create'
  | 'guests.update'
  | 'guests.export'
  | 'guests.import'
  | 'accommodations.read'
  | 'accommodations.write'
  | 'accommodations.availability'
  | 'pricing.read'
  | 'pricing.update'
  | 'promos.read'
  | 'promos.update'
  | 'services.read'
  | 'services.update'
  | 'users.read'
  | 'users.create'
  | 'users.invite'
  | 'users.update'
  | 'users.deactivate'
  | 'users.password'
  | 'users.sessions'
  | 'users.roles.manage'
  | 'settings.read'
  | 'settings.update'
  | 'dashboard.read'
  | 'analytics.read'
  | 'notices.read'
  | 'audit.read'
  | 'audit.export'

const STAFF_OPERATIONS: Permission[] = [
  'bookings.read',
  'bookings.create',
  'bookings.update',
  'bookings.check_in',
  'guests.read',
  'guests.create',
  'guests.update',
  'accommodations.read',
  'pricing.read',
  'promos.read',
  'services.read',
  'settings.read',
  'dashboard.read',
  'notices.read',
]

const ALL: Permission[] = [
  ...STAFF_OPERATIONS,
  'bookings.cancel',
  'bookings.reassign',
  'bookings.promo',
  'guests.export',
  'guests.import',
  'accommodations.write',
  'accommodations.availability',
  'pricing.update',
  'promos.update',
  'services.update',
  'users.read',
  'users.create',
  'users.invite',
  'users.update',
  'users.deactivate',
  'users.password',
  'users.sessions',
  'users.roles.manage',
  'settings.update',
  'analytics.read',
  'audit.read',
  'audit.export',
]

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: ALL,
  admin: ALL.filter(
    (permission) =>
      permission !== 'guests.export' &&
      permission !== 'users.create' &&
      permission !== 'users.invite' &&
      permission !== 'users.deactivate' &&
      permission !== 'users.roles.manage' &&
      permission !== 'audit.export',
  ),
  manager: [
    ...STAFF_OPERATIONS,
    'bookings.cancel',
    'bookings.reassign',
    'bookings.promo',
    'accommodations.availability',
    'users.read',
    'users.invite',
    'users.deactivate',
    'audit.read',
  ],
  receptionist: STAFF_OPERATIONS,
}

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function inviteableFrontendRoles(role: UserRole | undefined): Array<Exclude<UserRole, 'owner'>> {
  if (role === 'owner') return ['admin', 'manager', 'receptionist']
  if (role === 'manager') return ['receptionist']
  return []
}
