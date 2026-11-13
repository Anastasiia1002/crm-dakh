/**
 * Administrator invitation UI, GitHub Pages /invite route, and token stripping.
 * Run: npx --yes tsx src/lib/admin-invite.verify.ts
 */
import { readFileSync } from 'node:fs'
import { consumeInviteTokenFromLocation, inviteHref } from './invite-token'
import { inviteableFrontendRoles } from './permissions'
import { canCreateAdminUsers, canInviteAdminUsers, canInviteRole } from './roles'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(canInviteAdminUsers('owner'), 'owner may invite')
assert(canInviteAdminUsers('manager'), 'manager may invite receptionist')
assert(!canInviteAdminUsers('admin'), 'admin may not invite')
assert(!canInviteAdminUsers('receptionist'), 'receptionist may not invite')
assert(canInviteRole('owner', 'admin') && canInviteRole('owner', 'manager') && canInviteRole('owner', 'receptionist'), 'owner invite set')
assert(canInviteRole('manager', 'receptionist') && !canInviteRole('manager', 'admin') && !canInviteRole('manager', 'manager'), 'manager invite set')
assert(inviteableFrontendRoles('admin').length === 0, 'admin has no inviteable roles')
assert(canCreateAdminUsers('owner') && !canCreateAdminUsers('manager'), 'password create remains owner-only')

assert(inviteHref('/crm-dakh/') === '/crm-dakh/invite', 'Pages basename invite path')
assert(inviteHref('/') === '/invite', 'root invite path')

let replaced: string | null = null
const token = consumeInviteTokenFromLocation({
  search: '?token=secret-invite-token',
  pathname: '/crm-dakh/invite',
  replaceState: (url) => {
    replaced = url
  },
})
assert(token === 'secret-invite-token', 'token consumed')
assert(replaced === '/crm-dakh/invite', 'token stripped from address')
assert(!String(replaced).includes('token'), 'no token left in url')

const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes("path: '/invite'"), 'public invite route')
assert(router.includes('InviteAcceptPage'), 'invite page is wired')

const usersPage = readFileSync(new URL('../pages/users/UsersPage.tsx', import.meta.url), 'utf8')
const administrators = usersPage.slice(
  usersPage.indexOf('title="Адміністратори"'),
  usersPage.indexOf('title="Запрошення"'),
)
const invitations = usersPage.slice(
  usersPage.indexOf('title="Запрошення"'),
  usersPage.indexOf('function InviteAdminDialog'),
)
assert(usersPage.includes("value=\"invitations\""), 'invitations is a users-page tab')
assert(usersPage.includes('USERS_PAGE_TAB_LABEL'), 'tab labels stay in the shared helper')
assert(invitations.includes('Запросити співробітника'), 'invite CTA in invitations section')
assert(invitations.includes('canInvite'), 'invite CTA gated in invitations header')
assert(invitations.includes('Активних запрошень немає.'), 'empty invitations copy')
assert(invitations.includes('Дійсне до'), 'invitation expiration column')
assert(invitations.includes('Створено'), 'invitation created column')
assert(invitations.includes('Надіслати знову'), 'pending invitation resend reuses token rotation')
assert(invitations.includes('invitationStatusLabel'), 'Ukrainian invitation statuses')
assert(invitations.includes('staffInviteRoleLabel'), 'invite table uses staff invite labels')
assert(!administrators.includes('Запросити співробітника'), 'invite CTA not in administrators header')
assert(
  (usersPage.match(/<Button onClick=\{\(\) => setInviting\(true\)\}>Запросити співробітника<\/Button>/g) ?? [])
    .length === 1,
  'invite CTA button appears once',
)
assert(usersPage.includes('inviteableFrontendRoles'), 'invite dialog uses allowed roles')
const inviteDialog = usersPage.slice(usersPage.indexOf('function InviteAdminDialog'), usersPage.indexOf('function UserDialog'))
assert(inviteDialog.includes('inviteSchema'), 'invite form')
assert(inviteDialog.includes('staffInviteRoleLabel'), 'invite dialog uses staff invite labels')
assert(!inviteDialog.includes("register('password')"), 'invite dialog has no password field')

const acceptPage = readFileSync(new URL('../pages/auth/InviteAcceptPage.tsx', import.meta.url), 'utf8')
assert(acceptPage.includes('Прийняти запрошення'), 'accept CTA matches invitation email')
assert(acceptPage.includes('Призначена роль'), 'accept page shows assigned role')
assert(acceptPage.includes('expiresAt'), 'accept page shows expiration')

const api = readFileSync(new URL('../api/users.ts', import.meta.url), 'utf8')
const inviteFn = api.slice(api.indexOf('export async function inviteAdminUser'), api.indexOf('export async function previewAdminInvite'))
assert(inviteFn.includes('/api/admin/users/invitations'), 'invite API')
assert(!inviteFn.includes("input.role === 'admin'"), 'invite POST always sends the assigned role')
assert(inviteFn.includes('role: mapFrontendRole(input.role)'), 'invite POST maps the authorized role')
assert(api.includes('/api/auth/invites/preview'), 'preview endpoint')
assert(api.includes('/api/auth/invites/accept'), 'accept endpoint')
assert(api.includes('auth: false'), 'preview/accept are unauthenticated')

const spa = readFileSync(new URL('./vercel-spa.verify.ts', import.meta.url), 'utf8')
assert(spa.includes("fallsBack('/invite')"), 'SPA fallback covers /invite')

const sidebar = readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
assert(sidebar.includes('canAccessUsersPage'), 'users nav is permission-gated')
assert(sidebar.includes('canReadAnalytics'), 'analytics nav is permission-gated')

console.log('All administrator invitation checks passed.')
