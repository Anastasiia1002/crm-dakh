/**
 * Staff activity journal UI, role gating, and graceful old-backend handling.
 * Run: npx --yes tsx src/lib/admin-audit.verify.ts
 */
import { readFileSync } from 'node:fs'
import { hasPermission } from './permissions'
import { canExportAudit, canReadAudit } from './roles'
import { auditActorRoleLabel, entityHref, isAuditUnavailable, parseAuditPage } from './admin-audit'
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

const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes("path: 'audit'"), 'audit route')
assert(router.includes('AuditPage'), 'audit page wired')

const nav = readFileSync(new URL('../router/nav.ts', import.meta.url), 'utf8')
assert(nav.includes("label: 'Журнал дій'"), 'nav label')
assert(nav.includes("to: '/admin/audit'"), 'nav path')

const sidebar = readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
assert(sidebar.includes('canReadAudit'), 'audit nav gated')

const pageSrc = readFileSync(new URL('../pages/audit/AuditPage.tsx', import.meta.url), 'utf8')
assert(pageSrc.includes('Немає доступу'), 'access denied state')
assert(pageSrc.includes('ще не підключений на сервері'), 'old backend empty/unavailable state')
assert(pageSrc.includes('formatDateTimeKyiv'), 'kyiv timestamps')
assert(pageSrc.includes('canExportAudit'), 'export gated')
assert(pageSrc.includes("Експортувати CSV"), 'export label')
assert(pageSrc.includes('canExport'), 'owner-only export button')
assert(pageSrc.includes('Деталі'), 'keyboard-accessible details control')
assert(pageSrc.includes('aria-label={`Деталі: ${item.description}`}'), 'details button has accessible name')
assert(pageSrc.includes('auditActorRoleLabel'), 'audit uses receptionist-standardized role labels')
assert(!pageSrc.includes('Ресепшен'), 'audit page does not use Ресепшен')
assert(!pageSrc.includes('password'), 'page source does not mention passwords')

const usersPage = readFileSync(new URL('../pages/users/UsersPage.tsx', import.meta.url), 'utf8')
assert(usersPage.includes('title="Журнал дій"'), 'users page still has journal heading')
assert(usersPage.includes('to="/admin/audit"'), 'users page links to journal')

console.log('admin-audit.verify ok')
