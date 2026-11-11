import { apiRequest } from '@/lib/api-client'
import { delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { mapBackendRole, mapFrontendRole, type BackendAdminRole } from '@/lib/roles'
import type {
  AdminInvitation,
  AdminInvitationPreview,
  AdminUser,
  AdminUserCreateInput,
  AdminUserDetails,
  AdminUserListQuery,
  AdminUserPage,
  AdminUserUpdateInput,
  InviteAdminUserInput,
} from '@/types'

type BackendAdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  active: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  activeSessionCount?: number
}

type BackendAdminUserPage = {
  items: BackendAdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function listAdminUsers(query: AdminUserListQuery = {}): Promise<AdminUserPage> {
  const params = new URLSearchParams()
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.role) params.set('role', mapFrontendRole(query.role))
  if (query.active !== undefined) params.set('active', String(query.active))
  const suffix = params.toString() ? `?${params}` : ''
  const page = await apiRequest<BackendAdminUserPage>(`/api/admin/users${suffix}`)
  return {
    items: page.items.map(toAdminUser),
    pagination: page.pagination,
  }
}

export async function getAdminUser(id: string): Promise<AdminUserDetails> {
  const user = await apiRequest<BackendAdminUser>(`/api/admin/users/${id}`)
  return {
    ...toAdminUser(user),
    activeSessionCount: typeof user.activeSessionCount === 'number' ? user.activeSessionCount : 0,
  }
}

type BackendInvitation = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: 'pending' | 'expired' | 'accepted'
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

export async function listAdminInvitations(): Promise<AdminInvitation[]> {
  const page = await apiRequest<{ items: BackendInvitation[] }>('/api/admin/users/invitations')
  return page.items.map(toInvitation)
}

export async function inviteAdminUser(input: InviteAdminUserInput): Promise<AdminInvitation> {
  const created = await apiRequest<BackendInvitation>('/api/admin/users/invitations', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    },
  })
  return toInvitation(created)
}

export async function previewAdminInvite(token: string): Promise<AdminInvitationPreview> {
  const preview = await apiRequest<{
    email: string
    firstName: string
    lastName: string
    role: string
    expiresAt: string
  }>('/api/auth/invites/preview', {
    method: 'POST',
    body: { token },
    auth: false,
  })
  return {
    email: preview.email,
    firstName: preview.firstName,
    lastName: preview.lastName,
    role: mapBackendRole(preview.role),
    expiresAt: preview.expiresAt,
  }
}

export async function acceptAdminInvite(token: string, password: string) {
  return apiRequest<{ ok: true; email: string }>('/api/auth/invites/accept', {
    method: 'POST',
    body: { token, password },
    auth: false,
  })
}

export async function createAdminUser(input: AdminUserCreateInput): Promise<AdminUser> {
  const created = await apiRequest<BackendAdminUser>('/api/admin/users', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: mapFrontendRole(input.role),
      password: input.password,
    },
  })
  return toAdminUser(created)
}

export async function updateAdminUser(id: string, input: AdminUserUpdateInput): Promise<AdminUser> {
  const body: {
    email?: string
    firstName?: string
    lastName?: string
    role?: BackendAdminRole
    active?: boolean
  } = {}
  if (input.email !== undefined) body.email = input.email.trim().toLowerCase()
  if (input.firstName !== undefined) body.firstName = input.firstName.trim()
  if (input.lastName !== undefined) body.lastName = input.lastName.trim()
  if (input.role !== undefined) body.role = mapFrontendRole(input.role)
  if (input.active !== undefined) body.active = input.active
  const updated = await apiRequest<BackendAdminUser>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body,
  })
  return toAdminUser(updated)
}

export async function changeAdminPassword(id: string, password: string) {
  return apiRequest<{ ok: true }>(`/api/admin/users/${id}/change-password`, {
    method: 'POST',
    body: { password },
  })
}

export async function revokeAdminSessions(id: string) {
  return apiRequest<{ ok: true }>(`/api/admin/users/${id}/revoke-sessions`, {
    method: 'POST',
  })
}

/** Mock audit log for the Users page journal until an audit API exists. */
export async function getAudit() {
  await delay()
  return clone(db.audit)
}

function toInvitation(invite: BackendInvitation): AdminInvitation {
  return {
    id: invite.id,
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
    role: mapBackendRole(invite.role),
    status: invite.status,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    createdAt: invite.createdAt,
  }
}

function toAdminUser(user: BackendAdminUser): AdminUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: mapBackendRole(user.role),
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
