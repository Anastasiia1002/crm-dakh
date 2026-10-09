import { format, getDay, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Accommodation, Block, Booking, Guest, RoomType } from '@/types'

const CELL = 52

function offsetIndex(dates: string[], start: string) {
  if (start <= dates[0]) return 0
  const index = dates.findIndex((date) => date >= start)
  return index === -1 ? dates.length : index
}

function endIndex(dates: string[], endExclusive: string) {
  const index = dates.findIndex((date) => date >= endExclusive)
  return index === -1 ? dates.length : index
}

export function Chessboard({
  dates,
  accommodations,
  roomTypes,
  bookings,
  blocks,
  guests,
  onBooking,
  onEmpty,
}: {
  dates: string[]
  accommodations: Accommodation[]
  roomTypes: RoomType[]
  bookings: Booking[]
  blocks: Block[]
  guests: Guest[]
  onBooking: (id: string) => void
  onEmpty: (accommodationId: string, date: string) => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const width = dates.length * CELL
  const groups = roomTypes
    .map((type) => ({
      type,
      items: accommodations.filter((item) => item.roomTypeId === type.id),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="overflow-auto scroll-thin border-y border-border">
      <div className="min-w-max">
        <div className="sticky top-0 z-20 flex bg-background">
          <div className="sticky left-0 z-30 w-52 shrink-0 border-r border-b border-border bg-background" />
          <div className="flex" style={{ width }}>
            {dates.map((date) => {
              const day = getDay(parseISO(date))
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
                >
                  <div className="text-[10px] tracking-[0.12em] text-muted uppercase">
                    {format(parseISO(date), 'EEEEEE', { locale: uk })}
                  </div>
                  <div className="font-serif text-lg leading-none">{format(parseISO(date), 'd')}</div>
                </div>
              )
            })}
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.type.id}>
            <div className="sticky left-0 border-b border-border bg-surface-muted/60 px-3 py-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {group.type.name}
            </div>
            {group.items.map((item) => {
              const stayBars = bookings
                .filter((booking) => booking.accommodationId === item.id)
                .map((booking) => {
                  const start = offsetIndex(dates, booking.checkIn)
                  const end = endIndex(dates, booking.checkOut)
                  return { start, span: end - start, booking }
                })
                .filter((bar) => bar.span > 0 && bar.start < dates.length)
              const blockBars = blocks
                .filter((block) => block.roomId === item.id)
                .map((block) => {
                  const start = offsetIndex(dates, block.startDate)
                  const end = endIndex(dates, block.endDate)
                  return { start, span: end - start, block }
                })
                .filter((bar) => bar.span > 0 && bar.start < dates.length)
              const label = item.name?.trim() || item.number

              return (
                <div key={item.id} className="flex border-b border-border">
                  <div className="sticky left-0 z-10 flex w-52 shrink-0 items-center border-r border-border bg-background px-3">
                    <div>
                      <div className="text-sm">{label}</div>
                      <div className="text-[11px] text-muted-foreground">{item.number}</div>
                    </div>
                  </div>
                  <div className="relative h-12" style={{ width }}>
                    <div className="absolute inset-0 flex">
                      {dates.map((date) => {
                        const day = getDay(parseISO(date))
                        const weekend = day === 0 || day === 6
                        return (
                          <button
                            key={date}
                            type="button"
                            className={cn(
                              'h-full border-l border-border/70',
                              date === today && 'bg-surface-muted/80',
                              weekend && date !== today && 'bg-[#f7f1e7]',
                            )}
                            style={{ width: CELL }}
                            onClick={() => onEmpty(item.id, date)}
                            aria-label={`Нове бронювання, ${label}, ${date}`}
                          />
                        )
                      })}
                    </div>
                    {blockBars.map((bar) => (
                      <div
                        key={bar.block.id}
                        title={bar.block.reason ? bar.block.reason : undefined}
                        className="absolute top-1.5 flex h-9 items-center overflow-hidden rounded-sm border border-[#d7c3b4] bg-[#f3e6df] px-2 text-[11px] text-status-cancelled-foreground"
                        style={{
                          left: bar.start * CELL + 3,
                          width: bar.span * CELL - 6,
                          backgroundImage:
                            'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(138,74,60,0.08) 4px, rgba(138,74,60,0.08) 8px)',
                        }}
                      >
                        Блок
                      </div>
                    ))}
                    {stayBars.map((bar) => {
                      const guest = guests.find((person) => person.id === bar.booking.guestId)
                      return (
                        <button
                          key={bar.booking.id}
                          type="button"
                          className={cn(
                            'absolute top-1.5 flex h-9 items-center overflow-hidden rounded-sm px-2 text-left text-[12px]',
                            bar.booking.status === 'CHECKED_IN' && 'bg-status-checked-in text-status-checked-in-foreground',
                            bar.booking.status === 'CONFIRMED' && 'bg-status-confirmed text-status-confirmed-foreground',
                            bar.booking.status === 'PENDING' && 'bg-status-pending text-status-pending-foreground',
                            bar.booking.status === 'CHECKED_OUT' && 'bg-status-checked-out text-status-checked-out-foreground',
                          )}
                          style={{ left: bar.start * CELL + 3, width: Math.max(bar.span * CELL - 6, 28) }}
                          onClick={() => onBooking(bar.booking.id)}
                        >
                          <span className="truncate">{guest?.lastName ?? bar.booking.number}</span>
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
  )
}
