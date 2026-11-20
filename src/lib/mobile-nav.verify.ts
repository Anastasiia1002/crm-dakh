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
assert(header.includes('menuButtonRef'), 'the hamburger keeps a ref for focus restore')
assert(header.includes('onCloseAutoFocus'), 'closing the sheet restores focus in this layout, not only by Dialog default')
assert(header.includes('menuButtonRef.current?.focus()'), 'Escape returns focus to the hamburger')
assert(header.includes('onNavigate={() => onMenuOpenChange(false)}'), 'choosing a section closes the sheet')
assert(sheet.includes('DialogPrimitive.Title'), 'the sheet has an accessible title')
assert(sheet.includes('@radix-ui/react-dialog'), 'the sheet still uses Dialog for the focus trap')
assert(sidebar.includes('onNavigate'), 'sidebar links can close the sheet after navigation')
assert(header.includes('sticky top-0'), 'the app header stays at the top of the document while scrolling')
assert(header.includes('z-40'), 'the header stacks above page stickies and below dialogs')
assert(header.includes('bg-background') && !header.includes('bg-background/'), 'the header paints an opaque brand surface')
assert(!header.includes('backdrop-blur'), 'scrolled content does not show through the header')
assert(header.includes('pt-[env(safe-area-inset-top)]'), 'the header keeps the top safe-area inset')
assert(!layout.includes('overflow-x-hidden'), 'the shell does not clip overflow in a way that nests page scrolling')
assert(!layout.includes('overflow-y-'), 'admin pages keep the document as the scroll container')
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
assert(css.includes('overflow-x: clip'), 'horizontal overflow is clipped without creating a nested scrollport')
assert(css.includes('scroll-padding-top: calc(3.5rem + env(safe-area-inset-top, 0px))'), 'focus and anchors clear the stuck header')
assert(sheet.includes('z-50'), 'the navigation sheet stacks above the header')
const dialog = readFileSync(new URL('../components/ui/dialog.tsx', import.meta.url), 'utf8')
assert(dialog.includes('z-50'), 'dialogs stack above the header')
const menu = readFileSync(new URL('../components/ui/dropdown-menu.tsx', import.meta.url), 'utf8')
assert(menu.includes('z-50'), 'account and notice menus stack above the header')

console.log('PASS: mobile navigation is a single accessibility tree')
