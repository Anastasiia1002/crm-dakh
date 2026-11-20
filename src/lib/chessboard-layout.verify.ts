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
  chessboardTapAllowed,
  chessboardVisibleDateCount,
  CHESSBOARD_DESKTOP_CELL_PX,
  CHESSBOARD_DESKTOP_LABEL_PX,
  CHESSBOARD_MOBILE_DETAILS_PX,
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

assert(CHESSBOARD_MOBILE_SECTION_PX >= 36 && CHESSBOARD_MOBILE_SECTION_PX <= 40, 'section headings stay 36–40px')
assert(CHESSBOARD_MOBILE_DETAILS_PX === 44, 'the details control stays a 44px target')

const numbered = chessboardCompactStickyLabel({ displayTitle: 'Кімната Буковина', displayCode: '14/1' })
assert(numbered.primary === '14/1', 'compact row shows the unit number first')
assert(numbered.secondary === 'Кімната Буковина', 'compact row keeps the name underneath')
assert(numbered.hasStructuredNumber, 'a stored number is marked structured')

const screenshotCottage = '4-кімнатний будиночок до 7 гостей №11'
const screenshotRoom = '1-кімнатний номер для 2-х з балконом на гори №14/2'
assert(
  chessboardCompactStickyLabel({ displayTitle: screenshotCottage, displayCode: '№11' }).primary === '№11',
  'long names do not replace the unit number',
)
const typeOnly = chessboardCompactStickyLabel({ displayTitle: screenshotRoom, displayCode: null })
assert(typeOnly.primary === screenshotRoom, 'missing physical numbers keep the existing title')
assert(typeOnly.secondary === null, 'no invented identifier is added under a type title')
assert(!typeOnly.hasStructuredNumber, 'a title with №14/2 in the name is not a structured number')

assert(chessboardBarCaption('Коваль І.', 80) === 'Коваль І.', 'wide bars keep the guest label')
assert(chessboardBarCaption('Коваль І.', 44) === 'Коваль', 'narrow bars shorten to the first token')
assert(chessboardBarCaption('Коваль І.', 20) === '', 'very short bars stay color-only')

assert(chessboardPointerIsTap({ x: 10, y: 10 }, { x: 14, y: 12 }), 'a small pointer move is a tap')
assert(!chessboardPointerIsTap({ x: 10, y: 10 }, { x: 40, y: 12 }), 'a pan is not a tap')
assert(
  !chessboardTapAllowed({ origin: { x: 10, y: 10 }, point: { x: 11, y: 10 }, panned: true }),
  'a gesture marked panned is not a tap',
)
assert(
  !chessboardTapAllowed({ origin: { x: 10, y: 10 }, point: { x: 10, y: 10 }, panned: true }),
  'pointercancel leftover does not select',
)

const board = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
const fixture = readFileSync(new URL('./chessboard-mobile-fixture.ts', import.meta.url), 'utf8')
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
assert(board.includes('chessboardCompactStickyLabel'), 'compact rows use the number-first label')
assert(board.includes('chessboardTapAllowed'), 'clicks after a pan do not select')
assert(board.includes('onPointerCancel'), 'pointercancel clears a pending tap')
assert(!board.includes('setPointerCapture'), 'pointer capture does not steal the scroll gesture')
assert(!board.includes('touch-pan-x'), 'cells do not use conflicting pan-x-only touch-action')
assert(!board.includes('touch-pan-y'), 'cells do not use conflicting pan-y-only touch-action')
assert(board.includes('chessboard-pan'), 'grid cells share the pan touch-action class')
assert(css.includes('touch-action: pan-x pan-y'), 'native pan is allowed on both axes')
assert(!page.includes('max-h-[calc(100dvh-var(--admin-header-offset))]'), 'mobile calendar does not trap the board in a viewport-height scroller')
assert(!page.includes('flex min-h-0 flex-1 flex-col'), 'mobile calendar does not nest the board in a flex scrollport')
assert(board.includes("compact ? 'overflow-x-auto overscroll-x-contain'"), 'compact grid only scrolls dates horizontally')
assert(!board.includes("compact && 'max-h-[inherit]'"), 'compact grid height follows the page')
assert(board.includes("!compact && 'min-h-0 flex-1'"), 'desktop can still fill remaining height')
assert(!board.includes('disabled={!available}'), 'disabled night buttons do not eat iOS pans')
assert(board.includes('aria-label="Показати повну назву"'), 'full names stay behind an explicit control')
assert(board.includes('size-11'), 'the details control is a 44px target')
assert(board.includes('items-stretch'), 'name and date cells share the same row height')
assert(!board.includes('CHESSBOARD_MOBILE_ROW_PX'), 'compact rows are not a fixed 88px')
assert(!board.includes('Категорія'), 'the details dialog does not repeat the type as Категорія')
assert(!board.includes('без вигаданих номерів'), 'the details dialog has no implementation copy')
assert(board.includes("roomDetails?.displayCode ?"), 'Номер is omitted when there is no structured number')
assert(board.includes('line-clamp-2'), 'nameless rows clamp to two lines')
assert(board.includes('line-clamp-1'), 'a number plus name still stays within two lines')
assert(page.includes('filtersOpen'), 'secondary filters collapse on compact widths')
assert(page.includes('legendOpen'), 'the status legend collapses on compact widths')
assert(page.includes('aria-label="Статуси"'), 'the statuses disclosure has an accessible name')
assert(page.includes('Статуси'), 'the statuses disclosure label is Статуси')
assert(!page.includes('Легенда статусів'), 'the old legend label is gone')
assert(page.includes('Обрати період'), 'mobile range selection is an explicit mode')
assert(page.includes("rangePicking ? 'select' : 'browse'"), 'browsing empty nights does not start a range')
assert(page.includes('ChessboardStayDialog'), 'booking taps open a read-only details panel')
assert(page.includes('Скасувати'), 'range selection still has an explicit cancel')
assert(!page.includes('occupancyCheckOut'), 'calendar work does not mix occupancy checkout changes')
assert(page.includes("searchParams.get('fixture') === 'mobile'"), 'populated mobile fixtures stay behind an explicit DEV query')
assert(fixture.includes(screenshotCottage), 'the screenshot cottage name is in the isolated fixture')
assert(fixture.includes(screenshotRoom), 'the screenshot room name is in the isolated fixture')

console.log('PASS: chessboard mobile layout')
