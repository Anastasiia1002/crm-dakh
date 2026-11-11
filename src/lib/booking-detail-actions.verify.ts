/**
 * Booking detail actions stay grouped, and each control opens only its own path.
 * Run: npx --yes tsx src/lib/booking-detail-actions.verify.ts
 */
import { readFileSync } from 'node:fs'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { BookingDetailPage } from '../pages/bookings/BookingDetailPage'
import { AuthProvider } from '../hooks/useAuth'
import {
  bookingDetailActionTarget,
  bookingDetailOverflowActions,
  bookingDetailPrimaryAction,
  bookingStatusDialog,
} from './booking-detail-actions'
import type { AdminBookingDetail, AdminUser, BookingStatus } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function render(node: ReactNode) {
  return renderToStaticMarkup(node as ReactElement)
}

const bookingId = '11111111-1111-4111-8111-111111111111'

function booking(status: BookingStatus): AdminBookingDetail {
  return {
    id: bookingId,
    status,
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
}

function user(role: AdminUser['role']): AdminUser {
  return {
    id: 'user-1',
    firstName: 'Staging',
    lastName: 'Admin',
    email: 'admin@example.test',
    role,
    active: true,
  }
}

function renderDetail(status: BookingStatus, role: AdminUser['role']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['session'], user(role))
  client.setQueryData(['admin-booking', bookingId], booking(status))
  const router = createMemoryRouter([{ path: '/admin/bookings/:id', element: createElement(BookingDetailPage) }], {
    initialEntries: [`/admin/bookings/${bookingId}`],
  })
  return render(createElement(QueryClientProvider, { client }, createElement(AuthProvider, null, createElement(RouterProvider, { router }))))
}

function control(html: string, action: string) {
  return html.match(new RegExp(`<(button|a)\\b[^>]*data-action="${action}"[^>]*>`))?.[0] ?? ''
}

function presentActions(html: string) {
  return [...html.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1])
}

function main() {
  const reference = '11111111'
  const dialogs = (['confirm', 'check-in', 'check-out', 'no-show', 'cancel'] as const).map((action) => ({
    action,
    ...bookingStatusDialog(action, reference),
  }))
  const descriptions = new Set(dialogs.map((dialog) => dialog.description))
  const titles = new Set(dialogs.map((dialog) => dialog.title))
  assert(descriptions.size === dialogs.length, 'each status action has its own confirmation text')
  assert(titles.size === dialogs.length, 'each status action has its own confirmation title')
  for (const dialog of dialogs) {
    assert(dialog.description.includes(reference), `${dialog.action} names the booking reference`)
    assert(dialog.description.includes('Бронювання'), `${dialog.action} identifies the booking`)
    assert(dialog.confirmLabel.length > 0, `${dialog.action} has a confirm label`)
  }
  assert(bookingStatusDialog('check-in', reference).description.includes('Заселено'), 'check-in states the status change')
  assert(bookingStatusDialog('no-show', reference).description.includes('Не заїхав'), 'no-show states that the stay is closed')
  assert(bookingStatusDialog('cancel', reference).description.includes('скасоване'), 'cancel states that the booking is cancelled')
  assert(
    !bookingStatusDialog('check-in', reference).description.includes('скасоване'),
    'check-in does not reuse the cancellation consequence',
  )

  assert(bookingDetailActionTarget('edit') === 'edit-route', 'edit stays on the edit route')
  assert(bookingDetailActionTarget('move') === 'edit-route', 'room change stays on the edit route')
  assert(bookingDetailActionTarget('cancel') === 'cancel-dialog', 'cancel opens its own dialog')
  assert(bookingDetailActionTarget('check-in') === 'status-dialog', 'check-in opens a status dialog')
  assert(bookingDetailActionTarget('no-show') === 'status-dialog', 'no-show opens a status dialog')
  assert(bookingDetailActionTarget('check-in') !== bookingDetailActionTarget('cancel'), 'check-in and cancel do not share a target')
  assert(bookingDetailPrimaryAction(['confirm', 'cancel']) === 'confirm', 'pending primary is confirm')
  assert(bookingDetailPrimaryAction(['check-in', 'no-show', 'cancel']) === 'check-in', 'confirmed primary is check-in')
  assert(bookingDetailPrimaryAction(['check-out']) === 'check-out', 'checked-in primary is check-out')
  assert(bookingDetailPrimaryAction([]) === null, 'terminal bookings have no primary action')
  assert(bookingDetailOverflowActions(['check-in', 'no-show', 'cancel']).join(',') === 'no-show,cancel', 'overflow holds no-show and cancel')
  assert(bookingDetailOverflowActions(['confirm', 'cancel']).join(',') === 'cancel', 'pending overflow is cancel only')
  assert(bookingDetailOverflowActions(['check-out']).length === 0, 'checked-in has no overflow')

  const confirmed = renderDetail('CONFIRMED', 'admin')
  const confirmedActions = presentActions(confirmed)
  assert(
    confirmedActions.join(',') === 'check-in,edit,move,no-show,cancel',
    `confirmed booking shows only its own actions, got ${confirmedActions.join(',')}`,
  )
  const checkIn = control(confirmed, 'check-in')
  const noShow = control(confirmed, 'no-show')
  const cancel = control(confirmed, 'cancel')
  const edit = control(confirmed, 'edit')
  const move = control(confirmed, 'move')
  assert(checkIn.startsWith('<button') && checkIn.includes('min-h-11') && checkIn.includes('bg-primary'), 'check-in is a primary button')
  assert(noShow.startsWith('<button') && noShow.includes('min-h-11') && !noShow.includes('bg-primary'), 'no-show is a separate outlined button')
  assert(cancel.startsWith('<button') && cancel.includes('border-destructive!') && cancel.includes('text-destructive'), 'cancel is a destructive outlined button')
  assert(noShow.includes('border-warning!'), 'no-show keeps a warning border that overrides the shared border color')
  assert(!confirmed.includes('variant="ghost"'), 'the booking detail does not use a ghost action')
  assert(edit.startsWith('<a') && edit.includes(`href="/admin/bookings/${bookingId}/edit"`), 'edit is the booking edit link')
  assert(move.startsWith('<a') && move.includes(`href="/admin/bookings/${bookingId}/edit"`), 'move is the booking edit link')
  assert(confirmed.includes('Ще'), 'infrequent actions sit behind overflow')
  assert(confirmed.includes('Позначити незаїзд'), 'no-show label names the action')
  assert(confirmed.includes('flex-col') && confirmed.includes('md:flex-row'), 'actions stack on small screens and wrap from tablet width')

  const pending = presentActions(renderDetail('PENDING', 'admin'))
  assert(pending.join(',') === 'confirm,edit,move,cancel', `pending booking actions, got ${pending.join(',')}`)
  const stayed = presentActions(renderDetail('CHECKED_IN', 'admin'))
  assert(stayed.join(',') === 'check-out,edit', `checked-in booking actions, got ${stayed.join(',')}`)
  const desk = presentActions(renderDetail('CONFIRMED', 'receptionist'))
  assert(desk.join(',') === 'check-in,edit,no-show,cancel', `receptionist cannot reassign the room, got ${desk.join(',')}`)
  const closed = presentActions(renderDetail('CANCELLED', 'admin'))
  assert(closed.length === 0, 'a cancelled booking has no status actions')

  const page = readFileSync(new URL('../pages/bookings/BookingDetailPage.tsx', import.meta.url), 'utf8')
  const component = readFileSync(new URL('../components/bookings/BookingDetailActions.tsx', import.meta.url), 'utf8')
  assert(page.includes("onConfirm={() => setConfirm('confirm')}"), 'confirm button only opens the confirm dialog')
  assert(page.includes("onCheckIn={() => setConfirm('check-in')}"), 'check-in button only opens the check-in dialog')
  assert(page.includes("onCheckOut={() => setConfirm('check-out')}"), 'check-out button only opens the check-out dialog')
  assert(page.includes("onNoShow={() => setConfirm('no-show')}"), 'no-show button only opens the no-show dialog')
  assert(page.includes('onCancel={() => setCancelOpen(true)}'), 'cancel button only opens the cancel dialog')
  assert(page.includes("void runAction('cancel', reason)"), 'cancel confirmation still sends the cancel action and reason')
  assert(page.includes('void runAction(action)'), 'status confirmation sends the dialog action')
  assert(page.includes('statusMutation.mutateAsync'), 'status changes still use the existing mutation')
  assert(!page.includes("setConfirm('cancel')"), 'cancel is not sent through the status confirmation')
  assert(page.includes('onCloseAutoFocus') && page.includes('cancelRef.current?.focus()'), 'closing cancel returns focus to its button')
  assert(page.includes('returnFocusRef'), 'status dialogs return focus to the triggering button')
  assert(page.includes('if (pending) event.preventDefault()'), 'escape stays blocked while a mutation is pending')
  assert(component.includes('data-action="check-in"') && component.includes('onClick={onCheckIn}'), 'check-in control is bound to the check-in handler')
  assert(component.includes('dataAction="no-show"') && component.includes('onClick={onNoShow}'), 'no-show control is bound to the no-show handler')
  assert(component.includes('dataAction="cancel"') && component.includes('onClick={onCancel}'), 'cancel control is bound to the cancel handler')
  assert(component.includes('data-action="edit"') && component.includes('to={editTo}'), 'edit control is the edit route')
  assert(component.includes('data-action="move"') && component.includes('to={editTo}'), 'move control is the edit route')
  const handlers = ['onConfirm', 'onCheckIn', 'onCheckOut', 'onNoShow', 'onCancel'] as const
  for (const handler of handlers) {
    const uses = component.match(new RegExp(`onClick=\\{${handler}\\}`, 'g'))?.length ?? 0
    assert(uses === 1, `${handler} is attached to one control, got ${uses}`)
  }

  console.log('PASS: booking detail actions are grouped and wired to their own handlers')
}

main()
