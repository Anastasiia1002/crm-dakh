import { formatDate } from '@/lib/format'
import {
  monthGrid,
  shiftMonth,
  stayDateDisabled,
  weekdayLabels,
  type NightAvailability,
} from '@/lib/stay-calendar'

const MONTHS = [
  'січень',
  'лютий',
  'березень',
  'квітень',
  'травень',
  'червень',
  'липень',
  'серпень',
  'вересень',
  'жовтень',
  'листопад',
  'грудень',
]

function monthTitle(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${MONTHS[monthNumber - 1]} ${year}`
}

function cellClass(input: {
  availability: NightAvailability
  inMonth: boolean
  isCheckIn: boolean
  isCheckOut: boolean
  inStay: boolean
  closed: boolean
}) {
  if (input.isCheckIn || input.isCheckOut) return 'bg-primary text-primary-foreground'
  if (input.inStay) return 'bg-[#efe7dc] text-foreground'
  if (input.closed) return 'cursor-not-allowed text-muted-foreground/45'
  if (input.availability === 'occupied') return 'bg-[#e7d4cf] text-[#6d4038] line-through'
  if (input.availability === 'blocked') return 'bg-[#ece7df] text-muted-foreground'
  if (!input.inMonth) return 'text-muted-foreground/70'
  return 'bg-surface hover:bg-surface-muted'
}

export function StayCalendar({
  month,
  accommodationName,
  checkIn,
  checkOut,
  nights,
  today,
  allowSameDay = true,
  loading,
  error,
  disabled,
  onMonthChange,
  onSelect,
}: {
  month: string
  accommodationName: string
  checkIn: string
  checkOut: string
  nights: ReadonlyMap<string, NightAvailability>
  today: string
  allowSameDay?: boolean
  loading: boolean
  error: string | null
  disabled?: boolean
  onMonthChange: (month: string) => void
  onSelect: (date: string) => void
}) {
  const dates = monthGrid(month)
  const rangeLabel =
    checkIn && checkOut ? `${formatDate(checkIn)} — ${formatDate(checkOut)}` : checkIn ? `Заїзд ${formatDate(checkIn)}` : 'Оберіть заїзд, потім виїзд'

  return (
    <div className="max-w-full space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{accommodationName || 'Розміщення не обрано'}</p>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-sm"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            disabled={disabled}
          >
            Назад
          </button>
          <p className="min-w-28 text-center text-sm capitalize">{monthTitle(month)}</p>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-sm"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            disabled={disabled}
          >
            Далі
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {weekdayLabels().map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const availability = nights.has(date) ? nights.get(date)! : nights.size > 0 ? 'blocked' : 'free'
          const closed = stayDateDisabled(date, today, allowSameDay)
          const inStay = Boolean(checkIn && checkOut && date >= checkIn && date < checkOut)
          const isCheckIn = date === checkIn
          const isCheckOut = date === checkOut
          const dateDisabled = Boolean(disabled || closed)
          const reason = closed === 'past' ? 'минула дата' : closed === 'same-day' ? 'заїзд сьогодні вимкнено' : availability
          return (
            <button
              key={date}
              type="button"
              disabled={dateDisabled}
              aria-disabled={dateDisabled || undefined}
              onClick={() => {
                if (dateDisabled) return
                onSelect(date)
              }}
              onKeyDown={(event) => {
                if (!dateDisabled) return
                if (event.key === 'Enter' || event.key === ' ') event.preventDefault()
              }}
              className={`h-9 min-w-0 rounded-md text-sm tabular-nums disabled:cursor-not-allowed ${cellClass({
                availability,
                inMonth: date.startsWith(month),
                isCheckIn,
                isCheckOut,
                inStay,
                closed: Boolean(closed) && !isCheckIn && !isCheckOut && !inStay,
              })}`}
              aria-label={`${date}, ${reason}`}
              aria-pressed={isCheckIn || isCheckOut || inStay || undefined}
            >
              {Number(date.slice(8, 10))}
            </button>
          )
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <li>Вільна ніч</li>
        <li className="text-[#6d4038]">Зайнята ніч</li>
        <li>Недоступна ніч</li>
        <li className="text-muted-foreground/70">Минула дата</li>
        <li className="text-foreground">Обраний заїзд / виїзд</li>
      </ul>
      {loading ? <p className="text-sm text-muted-foreground">Завантаження доступності…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
