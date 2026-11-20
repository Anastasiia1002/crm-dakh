/**
 * Mobile chessboard metrics, compact labels, and tap-vs-pan.
 * Run: npx --yes tsx src/lib/chessboard-layout.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  chessboardBarCaption,
  chessboardCompactStickyLabel,
  chessboardMetrics,
  chessboardPointerIsTap,
  chessboardVisibleDateCount,
  CHESSBOARD_DESKTOP_CELL_PX,
  CHESSBOARD_DESKTOP_LABEL_PX,
} from './chessboard-layout.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const desktop = chessboardMetrics({ compact: false, availableWidth: 390 })
assert(desktop.labelWidth === CHESSBOARD_DESKTOP_LABEL_PX, 'desktop label stays 240px')
assert(desktop.cellWidth === CHESSBOARD_DESKTOP_CELL_PX, 'desktop cells stay 52px')

const phone = chessboardMetrics({ compact: true, availableWidth: 358 })
assert(phone.labelWidth >= 112 && phone.labelWidth <= 136, '390px content uses a 112–136px label')
assert(phone.cellWidth >= 44 && phone.cellWidth <= 48, '390px content uses 44–48px date cells')
assert(chessboardVisibleDateCount(phone, 358) >= 5, '390px shows about five dates beside the label')

const narrow = chessboardMetrics({ compact: true, availableWidth: 288 })
assert(narrow.labelWidth === 112, '320px content uses the 112px label floor')
assert(narrow.cellWidth === 44, '320px content uses the 44px cell floor')
assert(chessboardVisibleDateCount(narrow, 288) >= 4, '320px still shows several dates')

const tablet = chessboardMetrics({ compact: true, availableWidth: 712 })
assert(tablet.labelWidth === 136, '768px content uses the 136px label cap')
assert(tablet.cellWidth === 48, '768px content uses the 48px cell cap')

const numbered = chessboardCompactStickyLabel({ displayTitle: 'Кімната Буковина', displayCode: '14/1' })
assert(numbered.primary === '14/1', 'compact row shows the unit number first')
assert(numbered.secondary === 'Кімната Буковина', 'compact row keeps the name underneath')

const longName = chessboardCompactStickyLabel({
  displayTitle: '4-кімнатний будиночок до 7 гостей з терасою і видом на ліс',
  displayCode: '№11',
})
assert(longName.primary === '№11', 'long names do not replace the unit number')
assert(longName.secondary?.includes('4-кімнатний'), 'the full name stays available as secondary text')

const typeOnly = chessboardCompactStickyLabel({ displayTitle: 'Номер 14/3', displayCode: null })
assert(typeOnly.primary === 'Номер 14/3', 'missing physical numbers keep the existing title')
assert(typeOnly.secondary === null, 'no invented identifier is added under a type title')

assert(chessboardBarCaption('Коваль І.', 80) === 'Коваль І.', 'wide bars keep the guest label')
assert(chessboardBarCaption('Коваль І.', 44) === 'Коваль', 'narrow bars shorten to the first token')
assert(chessboardBarCaption('Коваль І.', 20) === '', 'very short bars stay color-only')

assert(chessboardPointerIsTap({ x: 10, y: 10 }, { x: 14, y: 12 }), 'a small pointer move is a tap')
assert(!chessboardPointerIsTap({ x: 10, y: 10 }, { x: 40, y: 12 }), 'a pan is not a tap')

const board = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
assert(board.includes('chessboardCompactStickyLabel'), 'compact rows use the number-first label')
assert(board.includes('chessboardPointerIsTap'), 'empty nights ignore pans')
assert(board.includes('aria-label="Показати повну назву"'), 'full names stay behind an explicit control')
assert(page.includes('filtersOpen'), 'secondary filters collapse on compact widths')
assert(page.includes('legendOpen'), 'the status legend collapses on compact widths')
assert(page.includes('ChessboardStayDialog'), 'booking taps open a read-only details panel')
assert(page.includes('Скасувати'), 'range selection still has an explicit cancel')
assert(!page.includes('occupancyCheckOut'), 'calendar work does not mix occupancy checkout changes')
assert(page.includes("searchParams.get('fixture') === 'mobile'"), 'populated mobile fixtures stay behind an explicit DEV query')
assert(page.includes('import.meta.env.DEV'), 'fixture boards are not used in production builds')

console.log('PASS: chessboard mobile layout')
