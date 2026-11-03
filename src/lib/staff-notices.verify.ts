import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { StaffNoticePanel } from '../components/layout/StaffNoticeMenu.tsx'
import {
  commitStaffNoticeReadAll,
  selectStaffNoticeList,
  staffNoticeQueryKey,
  unreadStaffNotices,
  withoutStaffNotice,
} from '../hooks/useStaffNotices.ts'
import type { StaffNotice, StaffNoticeList } from '../types/index.ts'
import { noticeTimeLabel } from './notice-time.ts'

const menu = readFileSync(new URL('../components/layout/StaffNoticeMenu.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../hooks/useStaffNotices.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../components/layout/Header.tsx', import.meta.url), 'utf8')
const api = readFileSync(new URL('../api/notifications.ts', import.meta.url), 'utf8')

assert.match(menu, /Нове бронювання|item\.title/)
assert.match(menu, /Очікують підтвердження/)
assert.match(menu, /Заїзди сьогодні/)
assert.match(menu, /Позначити всі як прочитані/)
assert.match(menu, /Немає непрочитаних сповіщень/)
assert.equal(menu.includes('Немає нових сповіщень'), false)
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
assert.match(api, /unread=true/)
assert.match(api, /NOTICE_LIMIT = 50/)
assert.match(api, /\/read-all/)
assert.match(api, /method: 'POST'/)
assert.match(menu, /Не вдалося завантажити сповіщення[\s\S]*Очікують підтвердження/)
assert.match(menu, /Очікують підтвердження[\s\S]*Заїзди сьогодні/)

const now = Date.parse('2026-12-20T12:00:00.000Z')
assert.equal(noticeTimeLabel('2026-12-20T11:59:30.000Z', now), 'щойно')
assert.equal(noticeTimeLabel('2026-12-20T11:00:00.000Z', now), '1 год тому')
assert.equal(noticeTimeLabel('2026-12-19T12:00:00.000Z', now), 'вчора')

assert.match(menu, /data-notice-header[\s\S]*data-notice-scroll[\s\S]*data-notice-footer/)
assert.match(menu, /overflow-y-auto/)
assert.match(menu, /min-h-0/)
assert.match(menu, /max-h-\[min\(440px,calc\(100dvh-160px\)\)\]/)
assert.match(menu, /if \(unread === 0 \|\| markAll\.isPending\) return/)
assert.match(menu, /markAll\.mutate\(\)/)
assert.match(menu, /const \[open, setOpen\] = useState\(false\)/)
assert.match(menu, /<DropdownMenu open=\{open\} onOpenChange=\{setOpen\}>/)
assert.match(
  menu,
  /onOpen=\{\(id\) => \{\s*setOpen\(false\)\s*markOne\(id\)/,
)
assert.match(menu, /Позначити як прочитане/)
assert.match(menu, /event\.stopPropagation\(\)/)
assert.match(menu, /pendingNoticeReads/)
assert.match(menu, /toast\.error\(errorMessage\(error\)\)/)
assert.equal(menu.includes('bookingStatus:'), false)
assert.match(
  menu,
  /onPending=\{\(\) => \{\s*setOpen\(false\)\s*navigate\('\/admin\/bookings'\)/,
)
assert.match(
  menu,
  /onToday=\{\(\) => \{\s*setOpen\(false\)\s*navigate\('\/admin'\)/,
)
assert.equal(menu.includes('setTimeout'), false)
assert.equal(menu.includes('setInterval'), false)
assert.equal(menu.includes('onMutate'), false)
assert.match(hook, /retry: false/)
assert.match(hook, /onSuccess: \(list\) => \{\s*commitStaffNoticeReadAll\(queryClient, list\)/)
assert.match(hook, /onMutate:/)
assert.match(hook, /cancelQueries\(\{ queryKey: staffNoticeQueryKey \}\)/)
assert.match(hook, /onError:/)

function render(node: ReactNode) {
  return renderToStaticMarkup(node as ReactElement)
}

function notice(id: string, unread: boolean): StaffNotice {
  return {
    id,
    title: 'Нове бронювання',
    bookingId: `booking-${id}`,
    bookingReference: '11111111-1111-4111-8111-111111111111',
    guestName: 'Test Guest',
    checkIn: '2026-11-10',
    checkOut: '2026-11-12',
    guestCount: 2,
    bookingStatus: 'PENDING',
    createdAt: '2026-12-20T11:00:00.000Z',
    unread,
  }
}

function panel(options: {
  items?: StaffNotice[]
  status?: 'ready' | 'loading' | 'error'
  unread: number
  pending?: boolean
  error?: string | null
}) {
  const status = options.status ?? 'ready'
  const state =
    status === 'ready'
      ? ({ status: 'ready', items: options.items ?? [] } as const)
      : ({ status } as const)
  return render(
    createElement(
      MemoryRouter,
      null,
      createElement(StaffNoticePanel, {
        state,
        unread: options.unread,
        markAllPending: options.pending ?? false,
        markAllError: options.error ?? null,
        onRetry: () => undefined,
        onMarkAll: () => undefined,
        onOpen: () => undefined,
        onMarkRead: () => undefined,
        pendingReadId: options.pending ? 'n0' : null,
        onPending: () => undefined,
        onToday: () => undefined,
      }),
    ),
  )
}

function markAllButton(html: string) {
  return html.match(/<button[^>]*data-mark-all[^>]*>/)?.[0] ?? ''
}

function isDisabled(tag: string) {
  return /(?:^|\s)disabled(?:=|\s|>)/.test(tag)
}

const many = Array.from({ length: 12 }, (_, index) => notice(`n${index}`, index < 3))
const open = panel({ items: many, unread: 3 })
const headerAt = open.indexOf('data-notice-header')
const scrollAt = open.indexOf('data-notice-scroll')
const footerAt = open.indexOf('data-notice-footer')
assert.ok(headerAt >= 0 && headerAt < scrollAt && scrollAt < footerAt, 'header and footer stay outside the notice list')
const scroll = open.slice(scrollAt, footerAt)
assert.match(scroll, /overflow-y-auto/)
assert.match(scroll, /min-h-0/)
assert.match(scroll, /max-h-\[min\(440px,calc\(100dvh-160px\)\)\]/)
assert.match(scroll, /href="\/admin\/bookings\/booking-n0"/)
assert.equal(open.slice(0, scrollAt).includes('data-notice-id'), false)
assert.match(open.slice(footerAt), /Очікують підтвердження/)
assert.match(open.slice(footerAt), /Заїзди сьогодні/)
assert.match(open, /Позначити всі як прочитані/)
assert.equal(isDisabled(markAllButton(open)), false, 'mark-all stays available while notices are unread')
assert.equal(markAllButton(open).includes('border'), false, 'mark-all is text, not a bordered button')
assert.equal(open.match(/data-unread="true"/g)?.length, 3)
assert.equal(open.includes('data-unread="false"'), false, 'read notices stay out of the dropdown')
assert.match(open, /aria-label="Позначити як прочитане"/)
assert.match(open, /title="Позначити як прочитане"/)

const none = panel({ items: [notice('read', false)], unread: 0 })
assert.equal(markAllButton(none), '', 'mark-all is hidden when nothing is unread')
assert.match(none, /Немає непрочитаних сповіщень/)
assert.equal(none.includes('data-notice-id'), false)
assert.equal(none.includes('data-unread="false"'), false)

const pending = panel({ items: many, unread: 3, pending: true })
assert.equal(isDisabled(markAllButton(pending)), true, 'mark-all cannot be submitted twice')
assert.match(pending, /Позначаємо…/)
assert.match(pending, /aria-busy="true"/)

const failed = panel({
  items: [notice('still-unread', true)],
  unread: 1,
  error: 'Не вдалося позначити сповіщення прочитаними.',
})
assert.match(failed, /Не вдалося позначити сповіщення прочитаними\./)
assert.match(failed, /data-unread="true"/)
assert.equal(isDisabled(markAllButton(failed)), false, 'a failed mark-all can be retried')
const loading = panel({ unread: 0, status: 'loading' })
assert.match(loading, /Завантажуємо сповіщення…/)
assert.match(loading.slice(loading.indexOf('data-notice-footer')), /Очікують підтвердження/)
const broken = panel({ unread: 0, status: 'error' })
assert.match(broken, /Не вдалося завантажити сповіщення/)
assert.match(broken.slice(broken.indexOf('data-notice-footer')), /Заїзди сьогодні/)

const current: StaffNoticeList = {
  unreadCount: 2,
  items: [notice('a', true), notice('b', true)],
}
const cache = new QueryClient()
cache.setQueryData(staffNoticeQueryKey, current)
assert.deepEqual(cache.getQueryData(staffNoticeQueryKey), current, 'a failed mark-all leaves the unread cache unchanged')
const partial: StaffNoticeList = {
  unreadCount: 1,
  items: [{ ...current.items[0], unread: false }, current.items[1]],
}
commitStaffNoticeReadAll(cache, partial)
const stored = cache.getQueryData<StaffNoticeList>(staffNoticeQueryKey)
assert.equal(stored?.unreadCount, 1, 'the badge uses the server unread count')
assert.equal(stored?.items.length, 1)
assert.equal(stored?.items[0]?.id, 'b')
assert.equal(stored?.items[0]?.unread, true, 'a read row is not kept in the dropdown cache')
const cleared: StaffNoticeList = {
  unreadCount: 0,
  items: current.items.map((item) => ({ ...item, unread: false })),
}
commitStaffNoticeReadAll(cache, cleared)
assert.equal(cache.getQueryData<StaffNoticeList>(staffNoticeQueryKey)?.unreadCount, 0)
assert.deepEqual(cache.getQueryData<StaffNoticeList>(staffNoticeQueryKey)?.items, [])

const mixed = unreadStaffNotices({
  unreadCount: 4,
  items: [notice('old-unread', true), notice('read', false), notice('new-unread', true)],
})
assert.deepEqual(mixed.items.map((item) => item.id), ['old-unread', 'new-unread'])
assert.equal(mixed.unreadCount, 4)
const removed = withoutStaffNotice(mixed, 'old-unread')
assert.deepEqual(removed.items.map((item) => item.id), ['new-unread'])
assert.equal(removed.unreadCount, 3)
const stale = selectStaffNoticeList(
  cache.getQueryData<StaffNoticeList>(staffNoticeQueryKey),
  { unreadCount: 2, items: [notice('stale', true)] },
  {
  seenGeneration: 1,
  activeGeneration: 2,
  mutations: 0,
})
assert.deepEqual(stale.items, [], 'a stale refetch does not restore notices marked read')
const fresh = selectStaffNoticeList(undefined, { unreadCount: 1, items: [notice('live', true), notice('done', false)] }, {
  seenGeneration: 2,
  activeGeneration: 2,
  mutations: 0,
})
assert.deepEqual(fresh.items.map((item) => item.id), ['live'])

console.log('staff notices verified')
