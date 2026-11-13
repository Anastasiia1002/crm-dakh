import { canAccessUsersManagement, canReadAudit } from '@/lib/roles'
import type { UserRole } from '@/types'

export const USERS_PAGE_TAB_VALUES = ['users', 'invitations', 'audit'] as const
export type UsersPageTab = (typeof USERS_PAGE_TAB_VALUES)[number]

export const USERS_PAGE_TAB_LABEL: Record<UsersPageTab, string> = {
  users: 'Користувачі',
  invitations: 'Запрошення',
  audit: 'Журнал дій',
}

export const AUDIT_SEARCH_KEYS = ['dateFrom', 'dateTo', 'actorId', 'category', 'entityType', 'page'] as const

export function canAccessUsersPage(role: UserRole | undefined) {
  return canAccessUsersManagement(role) || canReadAudit(role)
}

export function usersPageTabsFor(role: UserRole | undefined): UsersPageTab[] {
  const tabs: UsersPageTab[] = []
  if (canAccessUsersManagement(role)) {
    tabs.push('users', 'invitations')
  }
  if (canReadAudit(role)) tabs.push('audit')
  return tabs
}

export function parseUsersPageTab(raw: string | null, allowed: readonly UsersPageTab[]): UsersPageTab | null {
  if (raw && allowed.includes(raw as UsersPageTab)) return raw as UsersPageTab
  return allowed[0] ?? null
}

export function stripAuditSearchParams(params: URLSearchParams) {
  for (const key of AUDIT_SEARCH_KEYS) params.delete(key)
}

export function auditLegacyRedirectPath(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  params.set('tab', 'audit')
  const query = params.toString()
  return query ? `/admin/users?${query}` : '/admin/users?tab=audit'
}
