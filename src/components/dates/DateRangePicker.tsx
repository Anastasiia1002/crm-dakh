import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { firstEnabledFocusDate, keyboardDayFromTarget, nextInclusiveRange } from '@/lib/date-range-selection'
import { formatInclusiveDateRange } from '@/lib/format'
import { addCalendarDays, todayIso } from '@/lib/dates'
import {
  canBrowsePreviousMonth,
  monthGrid,
  monthKey,
  shiftMonth,
  weekdayLabels,
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

export type DateRangeValue = {
  start: string
  end: string
}

export function DateRangePicker({
  start,
  end,
  onChange,
  mode = 'range',
  minDate,
  allowPast = true,
  disabled = false,
  placeholder,
  id,
}: {
  start: string
  end?: string
  onChange: (next: DateRangeValue) => void
  mode?: 'range' | 'single'
  minDate?: string
  allowPast?: boolean
  disabled?: boolean
  placeholder?: string
  id?: string
}) {
  const today = todayIso()
  const closedBefore = allowPast ? minDate : minDate && minDate > today ? minDate : today
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => monthKey(start || end || today))
  const [draft, setDraft] = useState<DateRangeValue>({ start, end: end ?? '' })
  const [focusDate, setFocusDate] = useState(start || today)
  const focusDateRef = useRef(focusDate)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const labelId = useId()
  const dates = useMemo(() => monthGrid(month), [month])

  function rememberFocus(date: string) {
    focusDateRef.current = date
    setFocusDate(date)
  }

  useEffect(() => {
    if (open) return
    setDraft({ start, end: end ?? '' })
    if (start) setMonth(monthKey(start))
  }, [open, start, end])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closePicker(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePicker(true)
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const node = gridRef.current?.querySelector<HTMLButtonElement>(`button[aria-label="${focusDate}"]`)
    if (!node || node.disabled) return
    node.focus()
  }, [open, focusDate, month])

  const picking = Boolean(draft.start && !draft.end)
  const displayStart = picking ? draft.start : start
  const displayEnd = picking ? '' : end
  const display =
    mode === 'single'
      ? start
        ? formatInclusiveDateRange(start, start)
        : placeholder || 'Оберіть дату'
      : displayStart && displayEnd
        ? formatInclusiveDateRange(displayStart, displayEnd)
        : displayStart
          ? formatInclusiveDateRange(displayStart)
          : placeholder || 'Оберіть період'

  function dateClosed(date: string) {
    if (closedBefore && date < closedBefore) return true
    return false
  }

  function closePicker(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function openPicker() {
    if (disabled) return
    if (open) {
      closePicker(false)
      return
    }
    setDraft({ start, end: end ?? '' })
    const preferred = firstEnabledFocusDate(start || today, closedBefore) || start || today
    rememberFocus(preferred)
    setMonth(monthKey(preferred))
    setOpen(true)
  }

  function selectDate(date: string) {
    if (disabled || dateClosed(date)) return
    rememberFocus(date)
    if (mode === 'single') {
      onChange({ start: date, end: date })
      closePicker(true)
      return
    }
    const next = nextInclusiveRange(draft, date)
    setDraft(next)
    onChange(next)
    if (next.end) closePicker(true)
  }

  function moveFocus(delta: number) {
    const next = addCalendarDays(focusDateRef.current, delta)
    const enabled = firstEnabledFocusDate(next, closedBefore) || next
    rememberFocus(enabled)
    setMonth(monthKey(enabled))
  }

  const previousMonthEnabled = !disabled && canBrowsePreviousMonth(month, today, allowPast || !closedBefore)
  const rangeStart = picking ? draft.start : start
  const rangeEnd = picking ? draft.start : end

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPicker}
        className="flex h-10 w-full min-w-0 items-center rounded-md border border-input bg-background px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span id={labelId} className={displayStart ? 'text-foreground' : 'text-muted-foreground'}>
          {display}
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Календар періоду"
          className="absolute z-50 mt-2 w-[min(100vw-2rem,22rem)] max-w-full rounded-lg border border-border bg-background p-3 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-40"
              onClick={() => previousMonthEnabled && setMonth(shiftMonth(month, -1))}
              disabled={!previousMonthEnabled}
              aria-label="Попередній місяць"
            >
              Назад
            </button>
            <p className="min-w-28 text-center text-sm capitalize">{monthTitle(month)}</p>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-sm"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label="Наступний місяць"
            >
              Далі
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {weekdayLabels().map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div
            ref={gridRef}
            className="grid grid-cols-7 gap-1"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                moveFocus(-1)
              } else if (event.key === 'ArrowRight') {
                event.preventDefault()
                moveFocus(1)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                moveFocus(-7)
              } else if (event.key === 'ArrowDown') {
                event.preventDefault()
                moveFocus(7)
              } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                selectDate(keyboardDayFromTarget(event.target, focusDateRef.current))
              }
            }}
          >
            {dates.map((date) => {
              const closed = dateClosed(date)
              const inRange = Boolean(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd)
              const isEdge = date === rangeStart || date === rangeEnd
              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled || closed}
                  tabIndex={date === focusDate ? 0 : -1}
                  onFocus={() => rememberFocus(date)}
                  onMouseDown={() => rememberFocus(date)}
                  onClick={() => selectDate(date)}
                  className={`h-9 rounded-md text-sm tabular-nums disabled:cursor-not-allowed ${
                    isEdge
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : inRange
                        ? 'bg-[#efe7dc] font-medium'
                        : closed
                          ? 'text-muted-foreground/45 opacity-40'
                          : date.startsWith(month)
                            ? 'bg-surface hover:bg-surface-muted'
                            : 'text-muted-foreground/70 italic'
                  }`}
                  aria-label={date}
                  aria-pressed={inRange || undefined}
                >
                  {Number(date.slice(8, 10))}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
