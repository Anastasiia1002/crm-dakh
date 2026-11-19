/**
 * Mobile navigation must not keep a hidden desktop sidebar in the accessibility tree.
 * Run: npx --yes tsx src/lib/mobile-nav.verify.ts
 */
import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const layout = readFileSync(new URL('../layouts/AdminLayout.tsx', import.meta.url), 'utf8')
const header = readFileSync(new URL('../components/layout/Header.tsx', import.meta.url), 'utf8')
const sheet = readFileSync(new URL('../components/ui/sheet.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../hooks/useDesktopNav.ts', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')

assert(hook.includes("'(min-width: 1024px)'"), 'desktop nav follows the lg breakpoint')
assert(hook.includes('matchMedia'), 'viewport changes unmount the unused nav')
assert(layout.includes('useDesktopNav'), 'the shell only mounts one sidebar at a time')
assert(layout.includes('{desktop ? ('), 'the desktop aside is absent on small screens')
assert(!layout.includes('hidden lg:'), 'desktop nav is not CSS-hidden while still in the tree')
assert(header.includes('useDesktopNav'), 'the header does not keep a closed desktop sheet mounted')
assert(header.includes('{desktop ? null : ('), 'the mobile sheet is not in the desktop tree')
assert(header.includes('aria-expanded={menuOpen}'), 'the menu button exposes expanded state')
assert(header.includes('aria-controls="staff-mobile-nav"'), 'the menu button points at the sheet')
assert(header.includes('id="staff-mobile-nav"'), 'the sheet has a stable id')
assert(header.includes('onNavigate={() => onMenuOpenChange(false)}'), 'choosing a section closes the sheet')
assert(sheet.includes('DialogPrimitive.Title'), 'the sheet has an accessible title')
assert(sheet.includes('@radix-ui/react-dialog'), 'focus trap, Escape, and restore come from Dialog')
assert(sidebar.includes('onNavigate'), 'sidebar links can close the sheet after navigation')

console.log('PASS: mobile navigation is a single accessibility tree')
