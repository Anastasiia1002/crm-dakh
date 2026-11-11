/**
 * Administrator invitation UI, GitHub Pages /invite route, and token stripping.
 * Run: npx --yes tsx src/lib/admin-invite.verify.ts
 */
import { readFileSync } from 'node:fs'
import { consumeInviteTokenFromLocation, inviteHref } from './invite-token'
import { canCreateAdminUsers, canInviteAdminUsers } from './roles'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(canInviteAdminUsers('owner'), 'owner may invite')
assert(!canInviteAdminUsers('admin'), 'admin may not invite')
assert(!canInviteAdminUsers('receptionist'), 'receptionist may not invite')
assert(canInviteAdminUsers('owner') === canCreateAdminUsers('owner'), 'invite matches existing create policy')

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
assert(usersPage.includes('Запросити адміністратора'), 'invite CTA')
assert(usersPage.includes('canInviteAdminUsers'), 'invite gated by owner policy')
const inviteDialog = usersPage.slice(usersPage.indexOf('function InviteAdminDialog'), usersPage.indexOf('function UserDialog'))
assert(inviteDialog.includes('inviteSchema'), 'invite form')
assert(!inviteDialog.includes("register('password')"), 'invite dialog has no password field')

const api = readFileSync(new URL('../api/users.ts', import.meta.url), 'utf8')
const inviteFn = api.slice(api.indexOf('export async function inviteAdminUser'), api.indexOf('export async function previewAdminInvite'))
assert(inviteFn.includes('/api/admin/users/invitations'), 'invite API')
assert(!inviteFn.includes('role:'), 'invite POST does not send a client role')
assert(api.includes('/api/auth/invites/preview'), 'preview endpoint')
assert(api.includes('/api/auth/invites/accept'), 'accept endpoint')
assert(api.includes('auth: false'), 'preview/accept are unauthenticated')

const spa = readFileSync(new URL('./vercel-spa.verify.ts', import.meta.url), 'utf8')
assert(spa.includes("fallsBack('/invite')"), 'SPA fallback covers /invite')

console.log('All administrator invitation checks passed.')
