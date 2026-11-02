const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function noticeTimeLabel(iso: string, now = Date.now()) {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ''
  const elapsed = Math.max(0, now - time)
  if (elapsed < MINUTE) return 'щойно'
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return `${minutes} хв тому`
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return `${hours} год тому`
  }
  const days = Math.floor(elapsed / DAY)
  if (days === 1) return 'вчора'
  return `${days} дн. тому`
}
