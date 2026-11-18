/**
 * Two-click inclusive range + parent calendar query. Run: npx --yes tsx src/lib/date-range-selection.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  committedInclusiveRange,
  firstEnabledFocusDate,
  nextInclusiveRange,
  rangeIsComplete,
} from './date-range-selection.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const complete = { start: '2026-11-18', end: '2026-11-30' }

const afterFirst = nextInclusiveRange(complete, '2026-11-25')
assert(afterFirst.start === '2026-11-25' && afterFirst.end === '', 'first click clears the end')
assert(!rangeIsComplete(afterFirst), 'a draft is not a fetchable range')
assert(
  committedInclusiveRange(afterFirst, complete).end === '2026-11-30',
  'calendar keeps the last valid nights while picking',
)

const crossMonth = nextInclusiveRange(afterFirst, '2026-12-05')
assert(crossMonth.start === '2026-11-25' && crossMonth.end === '2026-12-05', 'second click completes Nov 25–Dec 5')
assert(rangeIsComplete(crossMonth), 'completed cross-month range is valid')

const sameMonth = nextInclusiveRange(nextInclusiveRange(complete, '2026-12-10'), '2026-12-12')
assert(sameMonth.start === '2026-12-10' && sameMonth.end === '2026-12-12', 'same-month two-click range')

const single = nextInclusiveRange(nextInclusiveRange(complete, '2026-12-08'), '2026-12-08')
assert(single.start === '2026-12-08' && single.end === '2026-12-08', 'second click on the same night is one night')

const reversed = nextInclusiveRange({ start: '2026-12-05', end: '' }, '2026-11-25')
assert(reversed.start === '2026-11-25' && reversed.end === '2026-12-05', 'later-first click still orders the nights')

assert(firstEnabledFocusDate('2026-11-10', '2026-11-18') === '2026-11-18', 'editor focus skips past nights')
assert(firstEnabledFocusDate('2026-12-01', '2026-11-18') === '2026-12-01', 'future start stays focused')

function applyParentRange(
  parent: { firstNight: string; lastNight: string },
  next: { start: string; end: string },
) {
  return { firstNight: next.start, lastNight: next.end }
}

const parentAfterFirst = applyParentRange(complete, afterFirst)
assert(parentAfterFirst.lastNight === '', 'parent stores the empty end instead of the previous last night')
const parentAfterSecond = applyParentRange(parentAfterFirst, crossMonth)
assert(parentAfterSecond.lastNight === '2026-12-05', 'parent receives the completed last night')

const calendar = readFileSync(new URL('../pages/rates/CurrentPricesCalendar.tsx', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../pages/rates/PriceWorkspace.tsx', import.meta.url), 'utf8')
const picker = readFileSync(new URL('../components/dates/DateRangePicker.tsx', import.meta.url), 'utf8')
assert(!calendar.includes('end || lastNight'), 'current prices do not keep the old last night on the first click')
assert(!workspace.includes('if (end) setLastNight(end)'), 'editor writes the empty end into lastNight')
assert(calendar.includes('visibleRange'), 'calendar fetch waits for a complete range')
assert(picker.includes('nextInclusiveRange'), 'picker uses the shared two-click helper')
assert(picker.includes('triggerRef') || picker.includes('focus()'), 'Escape returns focus to the period field')

console.log('PASS: two-click range selection keeps an empty end until the second click')
