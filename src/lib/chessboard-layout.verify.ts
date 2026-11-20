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
  CHESSBOARD_MOBILE_ROW_PX,
  CHESSBOARD_MOBILE_SECTION_PX,
} from './chessboard-layout.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const desktop = chessboardMetrics({ compact: false, availableWidth: 390 })
assert(desktop.labelWidth === CHESSBOARD_DESKTOP_LABEL_PX, 'desktop label stays 240px')
assert(desktop.cellWidth === CHESSBOARD_DESKTOP_CELL_PX, 'desktop cells stay 52px')

const phone = chessboardMetrics({ compact: true, availableWidth: 388 })
assert(phone.labelWidth >= 104 && phone.labelWidth <= 120, '390px content uses a 104–120px label')
assert(phone.cellWidth >= 44 && phone.cellWidth <= 48, '390px content uses 44–48px date cells')
assert(chessboardVisibleDateCount(phone, 388) >= 5, '390px shows about five dates beside the label')

const narrow = chessboardMetrics({ compact: true, availableWidth: 318 })
assert(narrow.labelWidth === 104, '320px content uses the 104px label floor')
assert(narrow.cellWidth === 44, '320px content uses the 44px cell floor')
assert(chessboardVisibleDateCount(narrow, 318) >= 4, '320px still shows several dates')

const tablet = chessboardMetrics({ compact: true, availableWidth: 752 })
assert(tablet.labelWidth === 120, '768px content uses the 120px label cap')
assert(tablet.cellWidth === 48, '768px content uses the 48px cell cap')

assert(CHESSBOARD_MOBILE_ROW_PX >= 80 && CHESSBOARD_MOBILE_ROW_PX <= 96, 'mobile rows stay 80–96px')
assert(CHESSBOARD_MOBILE_ROW_PX * 5 <= 500, 'five accommodation rows fit in about 500px')
assert(CHESSBOARD_MOBILE_SECTION_PX >= 36 && CHESSBOARD_MOBILE_SECTION_PX <= 40, 'section headings stay 36–40px')

const numbered = chessboardCompactStickyLabel({ displayTitle: 'Кімната Буковина', displayCode: '14/1' })
assert(numbered.primary === '14/1', 'compact row shows the unit number first')
assert(numbered.secondary === 'Кімната Буковина', 'compact row keeps the name underneath')
assert(numbered.hasStructuredNumber, 'a stored number is marked structured')

const screenshotName = '4-кімнатний будиночок до 7 гостей №11'
const longName = chessboardCompactStickyLabel({
  displayTitle: screenshotName,
  displayCode: '№11',
})
assert(longName.primary === '№11', 'long names do not replace the unit number')
assert(longName.secondary === screenshotName, 'the full screenshot name stays secondary, not parsed')

const forestName = '4-кімнатний будиночок до 7 гостей з терасою і видом на ліс'
const typeOnly = chessboardCompactStickyLabel({ displayTitle: forestName, displayCode: null })
assert(typeOnly.primary === forestName, 'missing physical numbers keep the existing title')
assert(typeOnly.secondary === null, 'no invented identifier is added under a type title')
assert(!typeOnly.hasStructuredNumber, 'a title is not treated as a structured number')
assert(!typeOnly.primary.startsWith('№14'), '№14/3 is not guessed from an arbitrary title')

assert(chessboardBarCaption('Коваль І.', 80) === 'Коваль І.', 'wide bars keep the guest label')
assert(chessboardBarCaption('Коваль І.', 44) === 'Коваль', 'narrow bars shorten to the first token')
assert(chessboardBarCaption('Коваль І.', 20) === '', 'very short bars stay color-only')

assert(chessboardPointerIsTap({ x: 10, y: 10 }, { x: 14, y: 12 }), 'a small pointer move is a tap')
assert(!chessboardPointerIsTap({ x: 10, y: 10 }, { x: 40, y: 12 }), 'a pan is not a tap')

const board = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
const fixture = readFileSync(new URL('./chessboard-mobile-fixture.ts', import.meta.url), 'utf8')
assert(board.includes('chessboardCompactStickyLabel'), 'compact rows use the number-first label')
assert(board.includes('chessboardPointerIsTap'), 'empty nights ignore pans')
assert(board.includes('aria-label="Показати повну назву"'), 'full names stay behind an explicit control')
assert(board.includes('CHESSBOARD_MOBILE_ROW_PX'), 'compact rows use the shared height')
assert(board.includes('line-clamp-2'), 'grid labels clamp instead of growing with the title')
assert(!board.includes("compact ? 'font-serif text-base'"), 'compact unit labels are not the heading serif')
assert(page.includes('-mx-4'), 'compact chessboard reclaims the page gutter')
assert(page.includes('filtersOpen'), 'secondary filters collapse on compact widths')
assert(page.includes('legendOpen'), 'the status legend collapses on compact widths')
assert(page.includes('ChessboardStayDialog'), 'booking taps open a read-only details panel')
assert(page.includes('Скасувати'), 'range selection still has an explicit cancel')
assert(!page.includes('occupancyCheckOut'), 'calendar work does not mix occupancy checkout changes')
assert(page.includes("searchParams.get('fixture') === 'mobile'"), 'populated mobile fixtures stay behind an explicit DEV query')
assert(page.includes('import.meta.env.DEV'), 'fixture boards are not used in production builds')
assert(fixture.includes(screenshotName), 'the screenshot cottage name is in the isolated fixture')
assert(fixture.includes(forestName), 'the long forest cottage name is in the isolated fixture')

console.log('PASS: chessboard mobile layout')
