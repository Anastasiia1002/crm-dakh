/**
 * Staff activity journal UI, role gating, and graceful old-backend handling.
 * Run: npx --yes tsx src/lib/admin-audit.verify.ts
 */
import { readFileSync } from 'node:fs'
import { hasPermission } from './permissions'
import { canExportAudit, canReadAudit } from './roles'
import { auditActorRoleLabel, entityHref, isAuditUnavailable, parseAuditPage } from './admin-audit'
import { auditLegacyRedirectPath, parseUsersPageTab, usersPageTabsFor } from './users-page-tabs'
import { ApiError } from './api-error'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(canReadAudit('owner') && canReadAudit('admin') && canReadAudit('manager'), 'audit read roles')
assert(!canReadAudit('receptionist'), 'receptionist cannot read audit')
assert(canExportAudit('owner') && !canExportAudit('admin') && !canExportAudit('manager'), 'export is owner only')
assert(hasPermission('owner', 'audit.export'), 'owner catalog includes export')
assert(!hasPermission('admin', 'audit.export'), 'admin catalog excludes export')

assert(auditActorRoleLabel('receptionist') === 'Рецепціоніст', 'audit role label is receptionist')
assert(auditActorRoleLabel('admin') === 'Адміністратор', 'audit admin role label')
assert(auditActorRoleLabel(null) === '—', 'missing audit role')

assert(entityHref('Booking', 'book-1') === '/admin/bookings/book-1', 'booking entity link')
assert(entityHref('Guest', 'g1') === '/admin/guests/g1', 'guest entity link')
assert(entityHref('Hotel', 'h1') === null, 'hotel has no CRM detail route')

assert(isAuditUnavailable(new ApiError('missing', 404)), '404 means undeployed audit API')
assert(!isAuditUnavailable(new ApiError('denied', 403)), '403 is access denied, not undeployed')

const page = parseAuditPage({
  items: [
    {
      id: '1',
      createdAt: '2026-03-10T10:00:00.000Z',
      actor: { id: 'a', displayName: 'Анна Адмін', role: 'ADMIN', active: true },
      action: 'booking.created',
      category: 'booking',
      entityType: 'Booking',
      entityLabel: 'Бронювання',
      entityId: 'b1',
      description: 'Створено бронювання',
      details: { source: 'ADMIN' },
      outcome: 'success',
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
})
assert(page.items[0]?.actor?.role === 'admin', 'backend role mapped')
assert(page.items[0]?.description === 'Створено бронювання', 'ukrainian description kept')

assert(usersPageTabsFor('owner').join() === 'users,invitations,audit', 'owner sees all users-page tabs')
assert(usersPageTabsFor('admin').join() === 'users,invitations,audit', 'admin sees all users-page tabs')
assert(usersPageTabsFor('manager').join() === 'users,invitations,audit', 'manager sees all users-page tabs')
assert(usersPageTabsFor('receptionist').length === 0, 'receptionist has no users-page tabs')
assert(parseUsersPageTab('audit', ['audit']) === 'audit', 'audit-only roles stay on the journal tab')
assert(parseUsersPageTab('users', ['audit']) === 'audit', 'unauthorized tab falls back to an allowed tab')
assert(
  auditLegacyRedirectPath('?category=booking&page=2') === '/admin/users?category=booking&page=2&tab=audit',
  'legacy audit URL keeps supported filters',
)

const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes("path: 'audit'"), 'audit route')
assert(router.includes('AuditPage'), 'audit page wired')

const nav = readFileSync(new URL('../router/nav.ts', import.meta.url), 'utf8')
assert(nav.includes("label: 'Користувачі'"), 'users remains in the sidebar')
assert(!nav.includes("to: '/admin/audit'"), 'audit is not a standalone sidebar item')
assert(!nav.includes("label: 'Журнал дій'"), 'journal label is not a sidebar item')

const sidebar = readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
assert(sidebar.includes('canAccessUsersPage'), 'users nav includes audit-capable roles')
assert(!sidebar.includes('canReadAudit'), 'audit is not gated as a separate nav item')

const pageSrc = readFileSync(new URL('../pages/audit/AuditPage.tsx', import.meta.url), 'utf8')
assert(pageSrc.includes('Navigate'), 'legacy audit path redirects')
assert(pageSrc.includes('auditLegacyRedirectPath'), 'redirect preserves query filters')

const panel = readFileSync(new URL('../pages/audit/AuditLogPanel.tsx', import.meta.url), 'utf8')
assert(panel.includes('Немає доступу'), 'access denied state')
assert(panel.includes('ще не підключений на сервері'), 'old backend empty/unavailable state')
assert(panel.includes('formatDateTimeKyiv'), 'kyiv timestamps')
assert(panel.includes('canExportAudit'), 'export gated')
assert(panel.includes('Експортувати CSV'), 'export label')
assert(panel.includes('canExport'), 'owner-only export button')
assert(panel.includes('Деталі'), 'keyboard-accessible details control')
assert(panel.includes('aria-label={`Деталі: ${item.description}`}'), 'details button has accessible name')
assert(panel.includes('auditActorRoleLabel'), 'audit uses receptionist-standardized role labels')
assert(panel.includes('useSearchParams'), 'filters stay in the URL')
assert(!panel.includes('Ресепшен'), 'audit page does not use Ресепшен')
assert(!panel.includes('password'), 'page source does not mention passwords')
assert(panel.includes('canAccessUsersManagement') && panel.includes('enabled: canRead && canListStaff'), 'actor list is not fetched without users.read')

const usersPage = readFileSync(new URL('../pages/users/UsersPage.tsx', import.meta.url), 'utf8')
assert(usersPage.includes("value=\"audit\""), 'journal is a users-page tab')
assert(usersPage.includes('AuditLogPanel'), 'users page reuses the audit interface')
assert(usersPage.includes('enabled: canAccess && tab === \'users\''), 'staff list is fetched only on the users tab')
assert(usersPage.includes('useAdminInvitations(canAccess && tab === \'invitations\')'), 'invitations are fetched only on the invitations tab')
assert(!usersPage.includes('Перейти до журналу дій'), 'users page teaser is gone')

console.log('admin-audit.verify ok')
