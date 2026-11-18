import { inclusiveNightCount } from '@/lib/price-nights'

export type InclusiveRange = {
  start: string
  end: string
}

export function rangeIsComplete(range: InclusiveRange) {
  return inclusiveNightCount(range.start, range.end) > 0
}

/** First click starts a draft with an empty end. Second click completes both ends. */
export function nextInclusiveRange(current: InclusiveRange, date: string): InclusiveRange {
  if (!date) return current
  if (!current.start || rangeIsComplete(current)) {
    return { start: date, end: '' }
  }
  if (date < current.start) return { start: date, end: current.start }
  return { start: current.start, end: date }
}

/** Keep the last valid period while a draft has no last night. */
export function committedInclusiveRange(next: InclusiveRange, previous: InclusiveRange): InclusiveRange {
  return rangeIsComplete(next) ? next : previous
}

export function firstEnabledFocusDate(preferred: string, closedBefore?: string) {
  if (!preferred) return ''
  if (closedBefore && preferred < closedBefore) return closedBefore
  return preferred
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Prefer the day that currently has DOM focus over React focusDate. */
export function keyboardDayFromTarget(target: unknown, fallback: string) {
  const label =
    target && typeof target === 'object' && 'getAttribute' in target && typeof target.getAttribute === 'function'
      ? String(target.getAttribute('aria-label') ?? '')
      : ''
  return ISO_DAY.test(label) ? label : fallback
}
