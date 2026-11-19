/**
 * Chessboard free/selected colors stay distinct from occupancy.
 * Run: npx --yes tsx src/lib/chessboard-colors.verify.ts
 */
import { readFileSync } from 'node:fs'
import { chessboardCell, chessboardLegend, CHESSBOARD_SELECTED_FILL, CHESSBOARD_WOOD } from './chessboard-colors.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(CHESSBOARD_WOOD === '#5b382b', 'selected wood is the DAKH primary')
assert(CHESSBOARD_SELECTED_FILL === 'rgba(91, 56, 43, 0.2)', 'selected fill is wood at 20%')
assert(chessboardLegend.occupied.includes('bg-status-checked-in'), 'occupied stays green')
assert(!chessboardLegend.free.includes('checked-in'), 'free legend is not occupancy green')
assert(!chessboardLegend.selected.includes('checked-in'), 'selected legend is not occupancy green')
assert(chessboardLegend.selected.includes('rgba(91,56,43,0.2)'), 'selected legend uses 20% wood')
assert(chessboardCell.selected.includes('border-[#5b382b]'), 'selected cells have a wood border')
assert(chessboardCell.selected.includes('text-foreground'), 'selected cells keep dark text')
assert(!chessboardCell.free.includes('checked-in'), 'free cells are not occupancy green')
assert(!chessboardCell.weekend.includes('checked-in'), 'weekend markers are not occupancy green')
assert(!chessboardCell.today.includes('checked-in'), 'today markers are not occupancy green')

const board = readFileSync(new URL('../components/calendar/Chessboard.tsx', import.meta.url), 'utf8')
const calendar = readFileSync(new URL('../pages/calendar/CalendarPage.tsx', import.meta.url), 'utf8')
assert(board.includes('chessboardCell'), 'the grid uses the shared cell colors')
assert(!board.includes("available && 'bg-status-checked-in/25'"), 'free nights are not a green wash')
assert(!board.includes("highlighted && 'bg-status-checked-in'"), 'selection is not occupancy green')
assert(board.includes('bg-status-checked-in text-status-checked-in-foreground'), 'checked-in bars stay green')
assert(calendar.includes('chessboardLegend'), 'the legend uses the shared swatches')
assert(calendar.includes('label="Вибрано"'), 'selected has a legend entry')
assert(calendar.includes('label="Заселено"'), 'occupied has a legend entry')
assert(calendar.includes('label="Вільно"'), 'free has a legend entry')

console.log('PASS: chessboard free and selected colors')
