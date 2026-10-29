/**
 * Button asChild must stay a single Radix Slot child.
 * The loading spinner used to pass null beside the link and throw:
 * "Slot failed to slot onto its children. Expected a single React element child or Slottable."
 * Run: npx --yes tsx src/lib/button-slot.verify.ts
 */
import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot } from '@radix-ui/react-slot'
import { createMemoryRouter, Link, MemoryRouter, RouterProvider } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { BookingsPage } from '../pages/bookings/BookingsPage'
import { BookingDetailPage } from '../pages/bookings/BookingDetailPage'
import { AuthProvider } from '../hooks/useAuth'
import type { AdminBookingDetail, AdminUser } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const SLOT_ERROR = 'Slot failed to slot onto its children'

function render(node: ReactNode): string {
  try {
    return renderToStaticMarkup(node as ReactElement)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes(SLOT_ERROR)) {
      throw new Error(`Radix Slot runtime crash: ${message}`)
    }
    throw error
  }
}

function countTags(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b`, 'g'))?.length ?? 0
}

function main() {
  let originalSlotCrash = false
  try {
    renderToStaticMarkup(
      createElement(Slot, null, null, createElement('a', { href: '/admin/bookings/new' }, 'Нове бронювання')),
    )
  } catch (error) {
    originalSlotCrash = error instanceof Error && error.message.includes(SLOT_ERROR)
  }
  assert(originalSlotCrash, 'harness must catch the original Slot exception for a null sibling')

  const plain = render(createElement(Button, { variant: 'outline' }, 'Зберегти'))
  assert(countTags(plain, 'button') === 1, 'plain button renders one button')
  assert(plain.includes('Зберегти'), 'plain button keeps its label')
  assert(!plain.includes('animate-spin'), 'plain button has no spinner')
  assert(!plain.includes('aria-busy'), 'plain button is not busy')

  const disabled = render(createElement(Button, { disabled: true }, 'Скасувати'))
  assert(disabled.includes('disabled=""'), 'disabled button sets disabled')
  assert(disabled.includes('aria-disabled="true"'), 'disabled button sets aria-disabled')
  assert(countTags(disabled, 'a') === 0, 'disabled button is not a link')

  const loading = render(createElement(Button, { loading: true }, 'Зберегти'))
  assert(countTags(loading, 'button') === 1, 'loading button stays one button')
  assert(loading.includes('animate-spin'), 'loading button renders the spinner')
  assert(loading.includes('Зберегти'), 'loading button keeps its label')
  assert(loading.includes('disabled=""'), 'loading button is disabled')
  assert(loading.includes('aria-busy="true"'), 'loading button is aria-busy')

  const link = render(
    createElement(
      MemoryRouter,
      null,
      createElement(Button, { asChild: true, loading: false }, createElement(Link, { to: '/admin/bookings/new' }, 'Нове бронювання')),
    ),
  )
  assert(countTags(link, 'a') === 1, 'asChild renders the router link')
  assert(countTags(link, 'button') === 0, 'asChild does not nest a button')
  assert(link.includes('href="/admin/bookings/new"'), 'asChild link keeps its href')
  assert(link.includes('Нове бронювання'), 'asChild link keeps its label')
  assert(!link.includes('animate-spin'), 'asChild without loading has no spinner')
  assert(!link.includes('aria-disabled="true"'), 'asChild without loading stays enabled')

  const busyLink = render(
    createElement(
      MemoryRouter,
      null,
      createElement(
        Button,
        { asChild: true, loading: true, variant: 'outline' },
        createElement(Link, { to: '/admin/bookings' }, 'Скасувати'),
      ),
    ),
  )
  assert(countTags(busyLink, 'a') === 1, 'loading asChild still renders one link')
  assert(countTags(busyLink, 'button') === 0, 'loading asChild does not nest a button')
  assert(busyLink.includes('href="/admin/bookings"'), 'loading asChild keeps navigation href')
  assert(busyLink.includes('Скасувати'), 'loading asChild keeps the label')
  assert(busyLink.includes('animate-spin'), 'loading asChild composes the spinner into the link')
  assert(busyLink.includes('aria-busy="true"'), 'loading asChild is aria-busy')
  assert(busyLink.includes('aria-disabled="true"'), 'loading asChild is aria-disabled')
  assert(busyLink.includes('tabindex="-1"'), 'loading asChild leaves the tab order')

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const bookings = render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, { initialEntries: ['/admin/bookings'] }, createElement(BookingsPage)),
    ),
  )
  assert(bookings.includes('Нове бронювання'), 'bookings page mounts the new-booking action')
  assert(bookings.includes('href="/admin/bookings/new"'), 'bookings page link target is intact')
  assert(countTags(bookings, 'a') >= 1, 'bookings page renders the navigation link')

  const bookingId = '11111111-1111-4111-8111-111111111111'
  const user: AdminUser = {
    id: 'user-1',
    firstName: 'Staging',
    lastName: 'Admin',
    email: 'admin@example.test',
    role: 'admin',
    active: true,
  }
  const booking: AdminBookingDetail = {
    id: bookingId,
    status: 'PENDING',
    source: 'ADMIN',
    checkIn: '2026-11-10',
    checkOut: '2026-11-12',
    adults: 2,
    children: 0,
    guestCount: 2,
    promoCodeId: null,
    createdAt: '2026-10-29T12:00:00.000Z',
    guest: {
      id: 'guest-1',
      firstName: 'Test',
      lastName: 'Guest',
      email: null,
      phone: null,
      country: null,
      city: null,
    },
    rooms: [
      {
        roomId: 'room-1',
        number: '1',
        roomTypeId: 'type-1',
        roomTypeName: 'Room',
        ratePlanId: 'plan-1',
      },
    ],
    totalAmount: '200.00',
    currency: 'UAH',
    notes: null,
    cancellationReason: null,
    cancelledAt: null,
    nights: [],
    services: [],
    price: {
      roomSubtotal: '200.00',
      servicesTotal: '0.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '200.00',
      currency: 'UAH',
    },
  }
  const detailClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  detailClient.setQueryData(['session'], user)
  detailClient.setQueryData(['admin-booking', bookingId], booking)
  const router = createMemoryRouter([{ path: '/admin/bookings/:id', element: createElement(BookingDetailPage) }], {
    initialEntries: [`/admin/bookings/${bookingId}`],
  })
  const detail = render(
    createElement(
      QueryClientProvider,
      { client: detailClient },
      createElement(AuthProvider, null, createElement(RouterProvider, { router })),
    ),
  )
  assert(detail.includes('Редагувати'), 'booking detail mounts the edit link')
  assert(detail.includes(`href="/admin/bookings/${bookingId}/edit"`), 'booking detail edit link is a router link')
  assert(!detail.includes(SLOT_ERROR), 'booking detail does not surface the Slot crash')

  console.log('PASS: button asChild keeps a single Slot child')
  console.log('All button Slot checks passed.')
}

main()
