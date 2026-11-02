import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { noticeTimeLabel } from './notice-time.ts'

const menu = readFileSync(new URL('../components/layout/StaffNoticeMenu.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../hooks/useStaffNotices.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../components/layout/Header.tsx', import.meta.url), 'utf8')
const api = readFileSync(new URL('../api/notifications.ts', import.meta.url), 'utf8')

assert.match(menu, /Нове бронювання|item\.title/)
assert.match(menu, /Очікують підтвердження/)
assert.match(menu, /Заїзди сьогодні/)
assert.match(menu, /Позначити всі як прочитані/)
assert.match(menu, /Немає нових сповіщень/)
assert.match(menu, /Завантажуємо сповіщення…/)
assert.match(menu, /Не вдалося завантажити сповіщення/)
assert.match(menu, /role="alert"/)
assert.match(menu, /aria-label=\{label\}/)
assert.match(menu, /\/admin\/bookings\/\$\{item\.bookingId\}/)
assert.match(menu, /w-\[min\(20rem,calc\(100vw-1\.5rem\)\)\]/)
assert.match(menu, /bookingStatusLabel/)
assert.equal(menu.includes('confirmationToken'), false)
assert.equal(menu.includes('localStorage'), false)
assert.equal(menu.includes('setInterval'), false)

assert.match(hook, /refetchInterval: STAFF_NOTICE_POLL_MS/)
assert.match(hook, /STAFF_NOTICE_POLL_MS = 25_000/)
assert.match(hook, /refetchIntervalInBackground: false/)
assert.match(hook, /refetchOnWindowFocus: true/)
assert.equal(hook.includes('setInterval'), false)
assert.equal(hook.match(/useQuery\(/g)?.length, 1)

assert.match(header, /<StaffNoticeMenu \/>/)
assert.match(api, /\/api\/admin\/notifications/)
assert.match(api, /\/read-all/)

const now = Date.parse('2026-12-20T12:00:00.000Z')
assert.equal(noticeTimeLabel('2026-12-20T11:59:30.000Z', now), 'щойно')
assert.equal(noticeTimeLabel('2026-12-20T11:00:00.000Z', now), '1 год тому')
assert.equal(noticeTimeLabel('2026-12-19T12:00:00.000Z', now), 'вчора')

console.log('staff notices verified')
