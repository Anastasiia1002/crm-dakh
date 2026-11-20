import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Info } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { chessboardStickyLabel, COTTAGE_KIND_GROUP_LABEL, ROOM_KIND_GROUP_LABEL } from '@/lib/accommodation-labels'
import { chessboardCell } from '@/lib/chessboard-colors'
import {
  chessboardBarCaption,
  chessboardCompactStickyLabel,
  chessboardMetrics,
  chessboardPointerIsTap,
  CHESSBOARD_DESKTOP_ROW_PX,
  CHESSBOARD_MOBILE_SECTION_PX,
} from '@/lib/chessboard-layout'
import { calendarDayOfMonth, calendarWeekday, todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ChessboardAdminBar, ChessboardModel, ChessboardRoomRow } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROW_MIN = CHESSBOARD_DESKTOP_ROW_PX

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

function kindSectionLabel(kind: ChessboardModel['groups'][number]['kind']) {
  if (kind === 'COTTAGE') return COTTAGE_KIND_GROUP_LABEL
  return ROOM_KIND_GROUP_LABEL
}

function useTapGuard() {
  const origin = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (event: ReactPointerEvent) => {
      origin.current = { x: event.clientX, y: event.clientY }
    },
    isTap: (event: { clientX: number; clientY: number }) =>
      chessboardPointerIsTap(origin.current, { x: event.clientX, y: event.clientY }),
  }
}

export function Chessboard({
  model,
  onBooking,
  onEmpty,
  onAdminBar,
  selected,
  emptyMode = 'book',
  compact = false,
}: {
  model: ChessboardModel
  onBooking: (bookingId: string) => void
  onEmpty: (roomId: string, date: string) => void
  onAdminBar?: (bar: ChessboardAdminBar) => void
  selected?: { roomId: string; startDate: string; endDate: string } | null
  emptyMode?: 'book' | 'select'
  compact?: boolean
}) {
  const today = todayIso()
  const { dates, groups } = model
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(compact ? 358 : 960)
  const [moreDates, setMoreDates] = useState(false)
  const [roomDetails, setRoomDetails] = useState<ChessboardRoomRow | null>(null)
  const tap = useTapGuard()
  const metrics = chessboardMetrics({ compact, availableWidth })
  const LABEL_WIDTH = metrics.labelWidth
  const CELL = metrics.cellWidth
  const sectionHeight = compact ? CHESSBOARD_MOBILE_SECTION_PX : undefined
  const width = dates.length * CELL

  useLayoutEffect(() => {
    const node = scrollerRef.current
    if (!node) return
    const sync = () => {
      setAvailableWidth(node.clientWidth)
      setMoreDates(node.scrollWidth - node.clientWidth - node.scrollLeft > 4)
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    node.addEventListener('scroll', sync, { passive: true })
    return () => {
      observer.disconnect()
      node.removeEventListener('scroll', sync)
    }
  }, [dates.length, LABEL_WIDTH, CELL])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        className={cn(
          'h-full overflow-auto scroll-thin rounded-md border border-border bg-surface overscroll-contain',
          compact && 'max-h-[inherit]',
        )}
      >
        <div className="min-w-max">
          <div className="sticky top-0 z-20 flex bg-surface">
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-b border-border bg-surface"
              style={{ width: LABEL_WIDTH }}
            />
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
                      weekend && date !== today && 'bg-secondary/70',
                    )}
                    style={{ width: CELL }}
                    title={localDateLabel(date)}
                  >
                    <div className="text-[10px] tracking-[0.12em] text-muted uppercase">
                      {WEEKDAY_LABELS[day]}
                    </div>
                    <div className={cn('leading-none', compact ? 'text-sm font-medium' : 'font-serif text-lg')}>
                      {calendarDayOfMonth(date)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.kind}>
              <div className="flex border-b border-border bg-surface-muted" style={{ width: LABEL_WIDTH + width, height: sectionHeight }}>
                <div
                  className={cn(
                    'sticky left-0 z-20 shrink-0 flex items-center border-r border-border bg-surface-muted text-[11px] font-medium tracking-[0.14em] text-foreground uppercase',
                    compact ? 'px-2' : 'px-3 py-2',
                  )}
                  style={{ width: LABEL_WIDTH, height: sectionHeight }}
                >
                  {kindSectionLabel(group.kind)}
                </div>
                <div className="shrink-0" style={{ width }} aria-hidden />
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

                const sticky = compact
                  ? chessboardCompactStickyLabel({
                      displayTitle: room.displayTitle,
                      displayCode: room.displayCode,
                    })
                  : (() => {
                      const desktop = chessboardStickyLabel({
                        groupTitle: group.displayName,
                        displayTitle: room.displayTitle,
                        displayCode: room.displayCode,
                      })
                      return { primary: desktop.title, secondary: desktop.subtitle, hasStructuredNumber: Boolean(room.displayCode) }
                    })()
                return (
                  <div
                    key={room.roomId}
                    className="flex items-stretch border-b border-border"
                    style={compact ? undefined : { minHeight: ROW_MIN }}
                  >
                    {compact ? (
                      <div
                        className="relative sticky left-0 z-10 flex min-h-11 shrink-0 items-start overflow-hidden border-r border-border bg-surface py-1 pl-2 pr-7"
                        style={{ width: LABEL_WIDTH }}
                      >
                        <div className="min-w-0 py-0.5">
                          <div
                            className={cn(
                              'text-sm font-medium leading-tight text-foreground',
                              sticky.hasStructuredNumber ? 'truncate' : 'line-clamp-2',
                            )}
                          >
                            {sticky.primary}
                          </div>
                          {sticky.secondary ? (
                            <div className="text-[11px] leading-tight text-muted-foreground line-clamp-1">
                              {sticky.secondary}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
                          aria-label="Показати повну назву"
                          onClick={() => setRoomDetails(room)}
                        >
                          <Info className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-surface px-3 py-2"
                        style={{ width: LABEL_WIDTH, minHeight: ROW_MIN }}
                      >
                        <div className="min-w-0">
                          <div className="text-sm leading-snug break-words">{sticky.primary}</div>
                          {sticky.secondary ? (
                            <div className="text-[11px] leading-snug text-muted-foreground break-words">
                              {sticky.secondary}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                    <div
                      className={cn('relative self-stretch overflow-hidden', compact && 'min-h-11')}
                      style={{ width, minHeight: compact ? undefined : ROW_MIN }}
                    >
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
                                'h-full touch-pan-x touch-pan-y border-l border-border/70',
                                available && !highlighted && chessboardCell.free,
                                available && !highlighted && night.date === today && chessboardCell.today,
                                available &&
                                  !highlighted &&
                                  weekend &&
                                  night.date !== today &&
                                  chessboardCell.weekend,
                                !available && 'cursor-default',
                                night.state === 'OUT_OF_ORDER' && 'bg-status-cancelled/80',
                                night.state === 'INACTIVE' && 'bg-surface-muted/50',
                                highlighted && chessboardCell.selected,
                              )}
                              style={{ width: CELL }}
                              onPointerDown={tap.onPointerDown}
                              onClick={(event) => {
                                if (!available) return
                                if (!tap.isTap(event)) return
                                onEmpty(room.roomId, night.date)
                              }}
                              aria-label={
                                available
                                  ? emptyMode === 'select'
                                    ? `Вибрати ніч, ${room.displayTitle}, ${night.date}`
                                    : `Нове бронювання, ${room.displayTitle}, ${night.date}`
                                  : `${room.displayTitle}, ${night.date}, ${night.state}`
                              }
                            />
                          )
                        })}
                      </div>

                      {adminBars.map(({ start, span, bar }) => {
                        const clickable = Boolean(bar.blockId && onAdminBar)
                        const barWidth = Math.max(span * CELL - 6, 28)
                        const caption = chessboardBarCaption(bar.label, barWidth)
                        const className = cn(
                          'absolute flex items-center overflow-hidden rounded-sm border px-1.5 text-left text-[11px]',
                          compact ? 'inset-y-1' : 'top-1.5 min-h-9',
                          bar.kind === 'MAINTENANCE' &&
                            'border-status-cancelled-mark bg-status-cancelled text-status-cancelled-foreground',
                          bar.kind === 'BLOCKED' &&
                            'border-status-cancelled-mark bg-status-cancelled text-status-cancelled-foreground',
                          bar.kind === 'OUT_OF_ORDER' &&
                            'border-status-cancelled-mark/70 bg-status-cancelled/80 text-status-cancelled-foreground',
                          bar.kind === 'INACTIVE' &&
                            'border-border bg-surface-muted text-muted-foreground',
                          clickable && 'cursor-pointer',
                        )
                        const style = {
                          left: start * CELL + 3,
                          width: barWidth,
                          backgroundImage:
                            bar.kind === 'BLOCKED' || bar.kind === 'MAINTENANCE'
                              ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(138,74,60,0.12) 4px, rgba(138,74,60,0.12) 8px)'
                              : undefined,
                        } as const
                        const title = bar.label
                        if (clickable) {
                          return (
                            <button
                              key={bar.key}
                              type="button"
                              title={title}
                              className={className}
                              style={style}
                              onPointerDown={tap.onPointerDown}
                              onClick={(event) => {
                                if (!tap.isTap(event)) return
                                onAdminBar?.(bar)
                              }}
                            >
                              <span className="truncate">{caption}</span>
                            </button>
                          )
                        }
                        return (
                          <div key={bar.key} title={title} className={className} style={style}>
                            <span className="truncate">{caption}</span>
                          </div>
                        )
                      })}

                      {stayBars.map(({ start, span, bar }) => {
                        const barWidth = Math.max(span * CELL - 6, 28)
                        const caption = chessboardBarCaption(bar.label, barWidth)
                        return (
                          <button
                            key={`${bar.bookingId}:${bar.roomId}:${bar.startDate}`}
                            type="button"
                            className={cn(
                              'absolute flex items-center overflow-hidden rounded-sm border px-1.5 text-left text-[12px]',
                              compact ? 'inset-y-1' : 'top-1.5 min-h-9',
                              bar.status === 'CHECKED_IN' &&
                                'border-status-checked-in-mark bg-status-checked-in text-status-checked-in-foreground',
                              bar.status === 'CONFIRMED' &&
                                'border-status-confirmed-mark bg-status-confirmed text-status-confirmed-foreground',
                              bar.status === 'PENDING' &&
                                'border-status-pending-mark bg-status-pending text-status-pending-foreground',
                              (bar.status === 'UNKNOWN' || bar.metadataMissing) &&
                                bar.status !== 'PENDING' &&
                                bar.status !== 'CONFIRMED' &&
                                bar.status !== 'CHECKED_IN' &&
                                'border-dashed border-foreground/40 bg-status-confirmed text-status-confirmed-foreground',
                            )}
                            style={{ left: start * CELL + 3, width: barWidth }}
                            onPointerDown={tap.onPointerDown}
                            onClick={(event) => {
                              if (!tap.isTap(event)) return
                              onBooking(bar.bookingId)
                            }}
                            title={
                              bar.metadataMissing
                                ? 'Зайнято (деталі бронювання не завантажено)'
                                : bar.label
                            }
                          >
                            <span className="truncate">{caption}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {moreDates ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-30 w-4 rounded-r-md bg-gradient-to-l from-surface/40 to-transparent"
          aria-hidden
        />
      ) : null}
      {moreDates ? <p className="sr-only">Є ще дати праворуч. Проведіть горизонтально.</p> : null}

      <Dialog open={roomDetails !== null} onOpenChange={(open) => !open && setRoomDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roomDetails?.displayTitle ?? 'Розміщення'}</DialogTitle>
            <DialogDescription className="sr-only">Деталі розміщення</DialogDescription>
          </DialogHeader>
          {roomDetails?.displayCode ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Номер </span>
              {roomDetails.displayCode}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
