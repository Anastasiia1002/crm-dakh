/**
 * Shared staff tabs keep a visible active state and a 44px target.
 * Run: npx --yes tsx src/lib/tabs.verify.ts
 */
import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const tabs = readFileSync(new URL('../components/ui/tabs.tsx', import.meta.url), 'utf8')
const users = readFileSync(new URL('../pages/users/UsersPage.tsx', import.meta.url), 'utf8')
const accommodations = readFileSync(new URL('../pages/accommodations/AccommodationsPage.tsx', import.meta.url), 'utf8')

assert(tabs.includes('min-h-11'), 'tab triggers stay at least 44px high')
assert(tabs.includes('overflow-x-auto'), 'tab lists can scroll on small screens')
assert(tabs.includes('border-b border-border'), 'inactive tabs share one baseline')
assert(tabs.includes('border-b-[3px]'), 'the active tab uses a 3px indicator')
assert(tabs.includes('data-[state=active]:border-primary'), 'the indicator is wood')
assert(tabs.includes('data-[state=active]:text-primary'), 'the active label is wood')
assert(tabs.includes('data-[state=active]:font-semibold'), 'the active label is 600')
assert(tabs.includes('data-[state=active]:bg-primary/10'), 'the active tab has a 10% wood wash')
assert(tabs.includes('text-muted-foreground'), 'inactive tabs stay muted')
assert(tabs.includes('border-transparent'), 'inactive tabs have no individual underline')
assert(tabs.includes('hover:bg-primary/5'), 'inactive tabs have a hover wash')
assert(tabs.includes('focus-visible:ring-2'), 'keyboard focus is visible')
assert(users.includes('TabsTrigger'), 'users / invitations / audit use the shared tabs')
assert(users.includes('USERS_PAGE_TAB_LABEL'), 'users tab labels stay permission-gated')
assert(accommodations.includes('TabsTrigger'), 'accommodation kind tabs use the shared component')

console.log('PASS: shared tabs show a visible active state')
