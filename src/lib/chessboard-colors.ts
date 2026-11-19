/** DAKH wood. Selected cells use this at 20% opacity, not the occupancy green. */
export const CHESSBOARD_WOOD = '#5b382b'

export const CHESSBOARD_SELECTED_FILL = 'rgba(91, 56, 43, 0.2)'

export const chessboardLegend = {
  free: 'border-border bg-surface',
  booked: 'border-status-confirmed-mark bg-status-confirmed',
  blocked: 'border-status-cancelled-mark bg-status-cancelled',
  selected: 'border-[#5b382b] bg-[rgba(91,56,43,0.2)]',
  pending: 'border-status-pending-mark bg-status-pending',
  occupied: 'border-status-checked-in-mark bg-status-checked-in',
} as const

export const chessboardCell = {
  free: 'bg-surface text-foreground hover:bg-surface-muted',
  today: 'bg-surface-muted text-foreground hover:bg-surface-muted',
  weekend: 'bg-secondary/50 text-foreground hover:bg-secondary/70',
  selected:
    'z-[1] border border-[#5b382b] bg-[rgba(91,56,43,0.2)] text-foreground hover:bg-[rgba(91,56,43,0.2)]',
} as const
