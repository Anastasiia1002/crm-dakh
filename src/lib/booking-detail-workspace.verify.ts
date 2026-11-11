/**
 * Booking workspace presentation helpers. Run: npx --yes tsx src/lib/booking-detail-workspace.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  bookingEmailHref,
  bookingGuestProfilePath,
  bookingPhoneHref,
  bookingStayNightCopy,
  bookingStayNightCount,
  bookingWorkspaceHasCancellation,
  bookingWorkspaceHasNotes,
} from './booking-detail-workspace.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(bookingStayNightCount('2026-11-10', '2026-11-12') === 2, 'two calendar nights')
assert(bookingStayNightCopy('2026-11-10', '2026-11-11') === '1 ніч', 'one night copy')
assert(bookingGuestProfilePath('guest-1') === '/admin/guests/guest-1', 'guest profile uses the hotel clients route')
assert(bookingPhoneHref('+380671112233') === 'tel:+380671112233', 'phone opens the dialer')
assert(bookingPhoneHref('12') === null, 'short numbers are not call links')
assert(bookingEmailHref('ivan@example.com') === 'mailto:ivan@example.com', 'email opens the mail client')
assert(bookingEmailHref('not-an-email') === null, 'invalid email is not a mail link')
assert(bookingWorkspaceHasNotes({ notes: 'VIP' }) === true, 'notes section appears when stored')
assert(bookingWorkspaceHasNotes({ notes: '  ' }) === false, 'blank notes stay omitted')
assert(bookingWorkspaceHasCancellation({ cancellationReason: 'Погода', cancelledAt: null }) === true, 'cancel reason is shown')
assert(bookingWorkspaceHasCancellation({ cancellationReason: null, cancelledAt: null }) === false, 'open bookings omit cancel block')

const page = readFileSync(new URL('../pages/bookings/BookingDetailPage.tsx', import.meta.url), 'utf8')
assert(page.includes('BookingStaySummary'), 'stay summary is on the workspace')
assert(page.includes('BookingFinancePanel'), 'existing price block stays in the sidebar')
assert(page.includes('BookingGuestPanel'), 'guest contacts stay on the workspace')
assert(!page.includes('activity') && !page.includes('timeline'), 'no invented activity log')
assert(page.includes('lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.9fr)]'), 'desktop uses a 65/35 workspace grid')

const actions = readFileSync(new URL('../components/bookings/BookingDetailActions.tsx', import.meta.url), 'utf8')
assert(actions.includes('<details'), 'overflow is in the document for infrequent actions')
assert(actions.includes('dataAction="no-show"') && actions.includes('dataAction="cancel"'), 'overflow still exposes status controls')

console.log('PASS: booking detail workspace keeps stored stay data compact')
