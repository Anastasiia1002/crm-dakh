import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chessboard } from '@/components/calendar/Chessboard'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/states'
import { useCalendar } from '@/hooks/useHotel'
import { addDaysIso, todayIso } from '@/lib/dates'
import { formatDateShort } from '@/lib/format'
import type { AccommodationKind } from '@/types'

const kinds: { id: AccommodationKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'room', label: 'Номери' },
  { id: 'house', label: 'Будиночки' },
]

export function CalendarPage() {
  const navigate = useNavigate()
  const [start, setStart] = useState(todayIso())
  const [kind, setKind] = useState<AccommodationKind | 'all'>('all')
  const days = 14
  const calendar = useCalendar(start, days, kind)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStart((value) => addDaysIso(value, -7))}>
            Назад
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(todayIso())}>
            Сьогодні
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart((value) => addDaysIso(value, 7))}>
            Далі
          </Button>
          <p className="px-2 text-sm text-muted-foreground">
            {calendar.data ? `${formatDateShort(calendar.data.dates[0])} — ${formatDateShort(calendar.data.dates.at(-1) ?? calendar.data.dates[0])}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {kinds.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md border px-3 py-1.5 text-sm ${
                kind === item.id ? 'border-foreground bg-primary text-primary-foreground' : 'border-border bg-surface'
              }`}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-status-pending" label="Очікує підтвердження" />
        <Legend className="bg-status-confirmed" label="Підтверджено" />
        <Legend className="bg-status-checked-in" label="Заселено" />
        <Legend className="bg-[#f3e6df]" label="Заблоковано" />
      </div>

      {calendar.isLoading || !calendar.data ? (
        <LoadingState />
      ) : (
        <Chessboard
          dates={calendar.data.dates}
          accommodations={calendar.data.accommodations}
          roomTypes={calendar.data.roomTypes}
          bookings={calendar.data.bookings}
          blocks={calendar.data.blocks}
          guests={calendar.data.guests}
          onBooking={(bookingId) => navigate(`/admin/bookings/${bookingId}`)}
          onEmpty={(accommodationId, date) =>
            navigate(`/admin/bookings/new?accommodationId=${accommodationId}&checkIn=${date}`)
          }
        />
      )}
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-3 rounded-sm border border-border ${className}`} />
      {label}
    </span>
  )
}
