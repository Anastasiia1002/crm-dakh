export const CHESSBOARD_DESKTOP_LABEL_PX = 240
export const CHESSBOARD_DESKTOP_CELL_PX = 52
export const CHESSBOARD_DESKTOP_ROW_PX = 56
export const CHESSBOARD_MOBILE_LABEL_MIN_PX = 104
export const CHESSBOARD_MOBILE_LABEL_MAX_PX = 120
export const CHESSBOARD_MOBILE_CELL_MIN_PX = 44
export const CHESSBOARD_MOBILE_CELL_MAX_PX = 48
export const CHESSBOARD_MOBILE_SECTION_PX = 38
export const CHESSBOARD_MOBILE_DETAILS_PX = 44
export const CHESSBOARD_TAP_SLOP_PX = 12

export type ChessboardMetrics = {
  labelWidth: number
  cellWidth: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Compact label + date cells so a 390px viewport shows about five nights beside the unit column.
 * Desktop keeps the existing 240 / 52 grid.
 */
export function chessboardMetrics(input: { compact: boolean; availableWidth: number }): ChessboardMetrics {
  if (!input.compact) {
    return { labelWidth: CHESSBOARD_DESKTOP_LABEL_PX, cellWidth: CHESSBOARD_DESKTOP_CELL_PX }
  }
  const width = Math.max(0, Math.floor(input.availableWidth))
  const labelWidth = clamp(Math.round(width * 0.3), CHESSBOARD_MOBILE_LABEL_MIN_PX, CHESSBOARD_MOBILE_LABEL_MAX_PX)
  const leftover = Math.max(0, width - labelWidth)
  const fiveMin = CHESSBOARD_MOBILE_CELL_MIN_PX * 5
  const fiveMax = CHESSBOARD_MOBILE_CELL_MAX_PX * 5
  const cellWidth =
    leftover >= fiveMax
      ? CHESSBOARD_MOBILE_CELL_MAX_PX
      : leftover >= fiveMin
        ? clamp(Math.floor(leftover / 5), CHESSBOARD_MOBILE_CELL_MIN_PX, CHESSBOARD_MOBILE_CELL_MAX_PX)
        : CHESSBOARD_MOBILE_CELL_MIN_PX
  return { labelWidth, cellWidth }
}

export function chessboardVisibleDateCount(metrics: ChessboardMetrics, availableWidth: number) {
  const leftover = Math.max(0, Math.floor(availableWidth) - metrics.labelWidth)
  return Math.max(0, Math.floor(leftover / metrics.cellWidth))
}

/**
 * Unit number first. Secondary text is the existing title, never a parsed id.
 * The grid clamps the whole label to two lines.
 */
export function chessboardCompactStickyLabel(input: { displayTitle: string; displayCode: string | null }) {
  const title = input.displayTitle.trim()
  const code = input.displayCode?.trim() || null
  if (code) {
    return { primary: code, secondary: title && title !== code ? title : null, hasStructuredNumber: true }
  }
  return { primary: title, secondary: null, hasStructuredNumber: false }
}

export function chessboardBarCaption(label: string, widthPx: number) {
  const text = label.trim()
  if (!text || widthPx < 36) return ''
  if (widthPx < 56) {
    const first = text.split(/\s+/)[0] ?? ''
    return first.slice(0, 8)
  }
  return text
}

export function chessboardPointerIsTap(
  origin: { x: number; y: number } | null,
  point: { x: number; y: number },
  slopPx = CHESSBOARD_TAP_SLOP_PX,
) {
  if (!origin) return true
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  return dx * dx + dy * dy <= slopPx * slopPx
}

/** Once the pointer has panned or the browser cancelled the gesture, clicks must not select or open dialogs. */
export function chessboardTapAllowed(input: {
  origin: { x: number; y: number } | null
  point: { x: number; y: number }
  panned: boolean
}) {
  if (input.panned) return false
  return chessboardPointerIsTap(input.origin, input.point)
}
