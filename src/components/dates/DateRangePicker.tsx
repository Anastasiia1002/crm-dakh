import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

const POPOVER_WIDTH_PX = 360
const VIEWPORT_MARGIN_PX = 12
const SHEET_BREAKPOINT_PX = 360

function monthTitle(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${MONTHS[monthNumber - 1]} ${year}`
}

function useSheetLayout() {
  const [sheet, setSheet] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < SHEET_BREAKPOINT_PX,
  )
  useLayoutEffect(() => {
    function sync() {
      setSheet(window.innerWidth < SHEET_BREAKPOINT_PX)
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  return sheet
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
  const [popoverBox, setPopoverBox] = useState({ top: 0, left: 0, width: POPOVER_WIDTH_PX })
  const focusDateRef = useRef(focusDate)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const sheet = useSheetLayout()
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

  function closePicker(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      closePicker(false)
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

  function focusGridDay(date: string) {
    const node = gridRef.current?.querySelector<HTMLButtonElement>(`button[aria-label="${date}"]`)
    if (!node || node.disabled) return false
    node.focus()
    return true
  }

  useLayoutEffect(() => {
    if (!open) return
    focusGridDay(focusDate)
  }, [open, focusDate, month, sheet])

  useLayoutEffect(() => {
    if (!open || sheet) return
    function place() {
      const trigger = triggerRef.current
      const panel = panelRef.current
      if (!trigger || !panel) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(POPOVER_WIDTH_PX, Math.max(0, window.innerWidth - VIEWPORT_MARGIN_PX * 2))
      const height = panel.offsetHeight
      let left = rect.left
      if (left + width > window.innerWidth - VIEWPORT_MARGIN_PX) {
        left = window.innerWidth - VIEWPORT_MARGIN_PX - width
      }
      if (left < VIEWPORT_MARGIN_PX) left = VIEWPORT_MARGIN_PX
      let top = rect.bottom + 8
      if (top + height > window.innerHeight - VIEWPORT_MARGIN_PX) {
        const above = rect.top - 8 - height
        top = above >= VIEWPORT_MARGIN_PX ? above : Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - VIEWPORT_MARGIN_PX - height)
      }
      setPopoverBox({ top, left, width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, sheet, month])

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

  function openPicker() {
    if (disabled) return
    if (open) {
      closePicker(false)
      return
    }
    const preferred = firstEnabledFocusDate(start || today, closedBefore) || start || today
    flushSync(() => {
      setDraft({ start, end: end ?? '' })
      rememberFocus(preferred)
      setMonth(monthKey(preferred))
      setOpen(true)
    })
    focusGridDay(preferred)
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

  const calendar = (
    <>
      <div className="date-range-calendar-nav">
        <button
          type="button"
          className="date-range-calendar-nav-btn"
          onClick={() => previousMonthEnabled && setMonth(shiftMonth(month, -1))}
          disabled={!previousMonthEnabled}
          aria-label="Попередній місяць"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="date-range-calendar-title">{monthTitle(month)}</p>
        <button
          type="button"
          className="date-range-calendar-nav-btn"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Наступний місяць"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="date-range-calendar-week">
        {weekdayLabels().map((label) => (
          <div key={label} className="date-range-weekday">
            {label}
          </div>
        ))}
      </div>
      <div
        ref={gridRef}
        className="date-range-calendar-grid"
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
              className={`date-range-day ${
                isEdge
                  ? 'date-range-day-edge'
                  : inRange
                    ? 'date-range-day-in-range'
                    : closed
                      ? 'date-range-day-closed'
                      : date.startsWith(month)
                        ? 'date-range-day-in-month'
                        : 'date-range-day-outside'
              }`}
              aria-label={date}
              aria-pressed={inRange || undefined}
            >
              {Number(date.slice(8, 10))}
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <div ref={rootRef} className="date-range-picker">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(event) => {
          if (disabled || open) return
          event.preventDefault()
        }}
        onClick={openPicker}
        className="date-range-picker-trigger"
      >
        <span id={labelId} className={displayStart ? 'text-foreground' : 'text-muted-foreground'}>
          {display}
        </span>
      </button>
      {open
        ? createPortal(
            sheet ? (
              <>
                <div className="date-range-calendar-backdrop" onMouseDown={() => closePicker(true)} />
                <div
                  ref={panelRef}
                  role="dialog"
                  aria-label="Календар періоду"
                  aria-modal="true"
                  className="date-range-calendar date-range-calendar--sheet"
                >
                  {calendar}
                </div>
              </>
            ) : (
              <div
                ref={panelRef}
                role="dialog"
                aria-label="Календар періоду"
                className="date-range-calendar date-range-calendar--popover"
                style={{ top: popoverBox.top, left: popoverBox.left, width: popoverBox.width }}
              >
                {calendar}
              </div>
            ),
            document.body,
          )
        : null}
    </div>
  )
}
