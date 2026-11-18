import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
  const [draftStart, setDraftStart] = useState(start)
  const [focusDate, setFocusDate] = useState(start || today)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const dates = useMemo(() => monthGrid(month), [month])

  useEffect(() => {
    if (!open) {
      setDraftStart(start)
      if (start) setMonth(monthKey(start))
    }
  }, [open, start])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const active = gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')
    active?.focus()
  }, [open, month, focusDate])

  const display =
    mode === 'single'
      ? start
        ? formatInclusiveDateRange(start, start)
        : placeholder || 'Оберіть дату'
      : start && end
        ? formatInclusiveDateRange(start, end)
        : start
          ? formatInclusiveDateRange(start)
          : placeholder || 'Оберіть період'

  function togglePicker() {
    if (disabled) return
    setOpen((value) => !value)
  }

  function dateClosed(date: string) {
    if (closedBefore && date < closedBefore) return true
    return false
  }

  function selectDate(date: string) {
    if (disabled || dateClosed(date)) return
    if (mode === 'single') {
      onChange({ start: date, end: date })
      setOpen(false)
      return
    }
    if (!draftStart || (start && end)) {
      setDraftStart(date)
      onChange({ start: date, end: '' })
      return
    }
    const nextStart = date < draftStart ? date : draftStart
    const nextEnd = date < draftStart ? draftStart : date
    onChange({ start: nextStart, end: nextEnd })
    setDraftStart(nextStart)
    setOpen(false)
  }

  function moveFocus(delta: number) {
    const next = addCalendarDays(focusDate, delta)
    setFocusDate(next)
    setMonth(monthKey(next))
  }

  const previousMonthEnabled = !disabled && canBrowsePreviousMonth(month, today, allowPast || !closedBefore)

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={togglePicker}
        className="flex h-10 w-full min-w-0 items-center rounded-md border border-input bg-background px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span id={labelId} className={start ? 'text-foreground' : 'text-muted-foreground'}>
          {display}
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Календар періоду"
          className="absolute z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-border bg-background p-3 shadow-lg"
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
                selectDate(focusDate)
              }
            }}
          >
            {dates.map((date) => {
              const closed = dateClosed(date)
              const rangeEnd = mode === 'single' ? start : end || draftStart
              const inRange = Boolean(start && rangeEnd && date >= start && date <= rangeEnd)
              const isEdge = date === start || date === rangeEnd
              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled || closed}
                  tabIndex={date === focusDate ? 0 : -1}
                  onFocus={() => setFocusDate(date)}
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
