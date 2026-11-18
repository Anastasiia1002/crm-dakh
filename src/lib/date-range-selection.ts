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
