import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { calendarDayOfMonth, calendarWeekday, todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ChessboardAdminBar, ChessboardModel } from '@/types'

const CELL = 52

const WEEKDAY_LABELS = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const

function offsetIndex(dates: string[], start: string) {
  if (dates.length === 0) return 0
  if (start <= dates[0]) return 0
  const index = dates.findIndex((date) => date >= start)
  return index === -1 ? dates.length : index
}

function endIndex(dates: string[], endExclusive: string) {
  const index = dates.findIndex((date) => date >= endExclusive)
  return index === -1 ? dates.length : index
}

function localDateLabel(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'd MMM', { locale: uk })
}

export function Chessboard({
  model,
  onBooking,
  onEmpty,
  onAdminBar,
  selected,
  emptyMode = 'book',
}: {
  model: ChessboardModel
  onBooking: (bookingId: string) => void
  onEmpty: (roomId: string, date: string) => void
  onAdminBar?: (bar: ChessboardAdminBar) => void
  selected?: { roomId: string; startDate: string; endDate: string } | null
  /** Writers choose a range. Other staff open a booking from one night. */
  emptyMode?: 'book' | 'select'
}) {
  const today = todayIso()
  const { dates, groups } = model
  const width = dates.length * CELL

  return (
    <div className="overflow-auto scroll-thin border-y border-border">
      <div className="min-w-max">
        <div className="sticky top-0 z-20 flex bg-background">
          <div className="sticky left-0 z-30 w-52 shrink-0 border-r border-b border-border bg-background" />
          <div className="flex" style={{ width }}>
            {dates.map((date) => {
              const day = calendarWeekday(date)
              const weekend = day === 0 || day === 6
              return (
                <div
                  key={date}
                  className={cn(
                    'shrink-0 border-b border-l border-border px-1 py-2 text-center',
                    date === today && 'bg-surface-muted',
                    weekend && date !== today && 'bg-[#efe8dc]',
                  )}
                  style={{ width: CELL }}
                  title={localDateLabel(date)}
                >
                  <div className="text-[10px] tracking-[0.12em] text-muted uppercase">
                    {WEEKDAY_LABELS[day]}
                  </div>
                  <div className="font-serif text-lg leading-none">{calendarDayOfMonth(date)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.roomTypeId}>
            <div className="sticky left-0 border-b border-border bg-surface-muted/60 px-3 py-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {group.name}
              {group.kind === 'UNKNOWN' ? ' · тип невідомий' : ''}
            </div>
            {group.rooms.map((room) => {
              const stayBars = model.bookingBars
                .filter((bar) => bar.roomId === room.roomId)
                .map((bar) => {
                  const start = offsetIndex(dates, bar.startDate)
                  const end = endIndex(dates, bar.endDate)
                  return { start, span: end - start, bar }
                })
                .filter((item) => item.span > 0 && item.start < dates.length)

              const adminBars = model.adminBars
                .filter((bar) => bar.roomId === room.roomId)
                .map((bar) => {
                  const start = offsetIndex(dates, bar.startDate)
                  const end = endIndex(dates, bar.endDate)
                  return { start, span: end - start, bar }
                })
                .filter((item) => item.span > 0 && item.start < dates.length)

              return (
                <div key={room.roomId} className="flex border-b border-border">
                  <div className="sticky left-0 z-10 flex w-52 shrink-0 items-center border-r border-border bg-background px-3">
                    <div>
                      <div className="text-sm">{room.number}</div>
                      <div className="text-[11px] text-muted-foreground">{group.name}</div>
                    </div>
                  </div>
                  <div className="relative h-12" style={{ width }}>
                    <div className="absolute inset-0 flex">
                      {room.nights.map((night) => {
                        const day = calendarWeekday(night.date)
                        const weekend = day === 0 || day === 6
                        const available = night.state === 'AVAILABLE'
                        const highlighted =
                          selected &&
                          selected.roomId === room.roomId &&
                          night.date >= selected.startDate &&
                          night.date < selected.endDate
                        return (
                          <button
                            key={night.date}
                            type="button"
                            disabled={!available}
                            className={cn(
                              'h-full border-l border-border/70',
                              night.date === today && 'bg-surface-muted/80',
                              weekend && night.date !== today && available && 'bg-[#f7f1e7]',
                              !available && 'cursor-default',
                              night.state === 'OUT_OF_ORDER' && 'bg-[#f0e4e4]',
                              night.state === 'INACTIVE' && 'bg-surface-muted/50',
                              highlighted && 'bg-[#d9e4d4]',
                            )}
                            style={{ width: CELL }}
                            onClick={() => {
                              if (available) onEmpty(room.roomId, night.date)
                            }}
                            aria-label={
                              available
                                ? emptyMode === 'select'
                                  ? `Вибрати ніч, ${room.number}, ${night.date}`
                                  : `Нове бронювання, ${room.number}, ${night.date}`
                                : `${room.number}, ${night.date}, ${night.state}`
                            }
                          />
                        )
                      })}
                    </div>

                    {adminBars.map(({ start, span, bar }) => {
                      const clickable = Boolean(bar.blockId && onAdminBar)
                      const className = cn(
                        'absolute top-1.5 flex h-9 items-center overflow-hidden rounded-sm border px-2 text-left text-[11px]',
                        bar.kind === 'MAINTENANCE' &&
                          'border-[#d7c3b4] bg-[#f3e6df] text-status-cancelled-foreground',
                        bar.kind === 'BLOCKED' &&
                          'border-[#d7c3b4] bg-[#f3e6df] text-status-cancelled-foreground',
                        bar.kind === 'OUT_OF_ORDER' &&
                          'border-border bg-[#efe0e0] text-muted-foreground',
                        bar.kind === 'INACTIVE' &&
                          'border-border bg-surface-muted text-muted-foreground',
                        clickable && 'cursor-pointer',
                      )
                      const style = {
                        left: start * CELL + 3,
                        width: Math.max(span * CELL - 6, 28),
                        backgroundImage:
                          bar.kind === 'BLOCKED' || bar.kind === 'MAINTENANCE'
                            ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(138,74,60,0.08) 4px, rgba(138,74,60,0.08) 8px)'
                            : undefined,
                      } as const
                      const title = bar.blockId ? `${bar.label} · ${bar.blockId}` : bar.label
                      if (clickable) {
                        return (
                          <button
                            key={bar.key}
                            type="button"
                            title={title}
                            className={className}
                            style={style}
                            onClick={() => onAdminBar?.(bar)}
                          >
                            {bar.label}
                          </button>
                        )
                      }
                      return (
                        <div key={bar.key} title={title} className={className} style={style}>
                          {bar.label}
                        </div>
                      )
                    })}

                    {stayBars.map(({ start, span, bar }) => (
                      <button
                        key={`${bar.bookingId}:${bar.roomId}:${bar.startDate}`}
                        type="button"
                        className={cn(
                          'absolute top-1.5 flex h-9 items-center overflow-hidden rounded-sm px-2 text-left text-[12px]',
                          bar.status === 'CHECKED_IN' &&
                            'bg-status-checked-in text-status-checked-in-foreground',
                          bar.status === 'CONFIRMED' &&
                            'bg-status-confirmed text-status-confirmed-foreground',
                          bar.status === 'PENDING' && 'bg-status-pending text-status-pending-foreground',
                          (bar.status === 'UNKNOWN' || bar.metadataMissing) &&
                            bar.status !== 'PENDING' &&
                            bar.status !== 'CONFIRMED' &&
                            bar.status !== 'CHECKED_IN' &&
                            'bg-status-confirmed/80 text-status-confirmed-foreground ring-1 ring-dashed ring-foreground/30',
                        )}
                        style={{ left: start * CELL + 3, width: Math.max(span * CELL - 6, 28) }}
                        onClick={() => onBooking(bar.bookingId)}
                        title={
                          bar.metadataMissing
                            ? 'Зайнято (деталі бронювання не завантажено)'
                            : bar.label
                        }
                      >
                        <span className="truncate">{bar.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
