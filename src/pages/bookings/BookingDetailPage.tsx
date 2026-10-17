import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { LoadingState } from '@/components/ui/states'
import { Textarea } from '@/components/ui/textarea'
import { useAdminBooking, useAdminBookingStatus } from '@/hooks/useBookings'
import {
  adminBookingRef,
  adminBookingStatusActions,
  adminGuestName,
  adminRoomsLabel,
  canEditAdminBookingProfile,
  formatAdminBookingMoney,
  isAdminBookingTerminal,
} from '@/lib/admin-booking-view'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime, formatGuests } from '@/lib/format'
import { adminBookingSourceLabel } from '@/lib/labels'
import type { AdminBookingStatusAction } from '@/types'

export function BookingDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const bookingQuery = useAdminBooking(id)
  const statusMutation = useAdminBookingStatus(id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState<Exclude<AdminBookingStatusAction, 'cancel'> | null>(null)

  if (bookingQuery.isLoading) return <LoadingState />

  if (bookingQuery.isError) {
    const notFound = bookingQuery.error instanceof ApiError && bookingQuery.error.status === 404
    return (
      <div className="space-y-3 border-t border-border py-10">
        <p className="text-sm">{notFound ? 'Бронювання не знайдено.' : 'Не вдалося завантажити бронювання.'}</p>
        {!notFound ? <p className="text-sm text-muted-foreground">{errorMessage(bookingQuery.error)}</p> : null}
        <div className="flex flex-wrap gap-2">
          {!notFound ? (
            <Button size="sm" variant="outline" onClick={() => void bookingQuery.refetch()}>
              Спробувати ще раз
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => navigate('/admin/bookings')}>
            До списку
          </Button>
        </div>
      </div>
    )
  }

  if (!bookingQuery.data) {
    return <p className="text-sm text-destructive">Бронювання не знайдено.</p>
  }

  const booking = bookingQuery.data
  const price = booking.price
  const actions = adminBookingStatusActions(booking.status)
  const closed = isAdminBookingTerminal(booking.status)
  const canEdit = canEditAdminBookingProfile(booking.status)

  async function runAction(action: AdminBookingStatusAction, cancellationReason?: string) {
    try {
      await statusMutation.mutateAsync({
        action,
        cancel: cancellationReason ? { cancellationReason } : undefined,
      })
      toast.success('Статус оновлено')
      setConfirm(null)
      setCancelOpen(false)
      setReason('')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="max-w-5xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase" title={booking.id}>
            {adminBookingRef(booking.id)}
          </p>
          <h2 className="mt-2 font-serif text-4xl font-medium">{adminGuestName(booking.guest)}</h2>
          <div className="mt-3">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !closed ? (
            <Button variant="outline" asChild>
              <Link to={`/admin/bookings/${booking.id}/edit`}>Редагувати</Link>
            </Button>
          ) : null}
          {actions.includes('confirm') ? (
            <Button onClick={() => setConfirm('confirm')}>Підтвердити</Button>
          ) : null}
          {actions.includes('check-in') ? (
            <Button onClick={() => setConfirm('check-in')}>Заселити</Button>
          ) : null}
          {actions.includes('check-out') ? (
            <Button onClick={() => setConfirm('check-out')}>Виселити</Button>
          ) : null}
          {actions.includes('no-show') ? (
            <Button variant="outline" onClick={() => setConfirm('no-show')}>
              Не заїхав
            </Button>
          ) : null}
          {actions.includes('cancel') ? (
            <Button variant="ghost" onClick={() => setCancelOpen(true)}>
              Скасувати бронювання
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Проживання</h3>
          <Info label="Номер / будиночок" value={adminRoomsLabel(booking.rooms)} />
          <Info label="Заїзд" value={formatDate(booking.checkIn)} />
          <Info label="Виїзд" value={formatDate(booking.checkOut)} />
          <Info label="Гості" value={formatGuests(booking.adults, booking.children)} />
          <Info label="У бронюванні" value={String(booking.guestCount)} />
          <Info label="Джерело" value={adminBookingSourceLabel[booking.source]} />
          <Info label="Створено" value={formatDateTime(booking.createdAt)} />
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Гість</h3>
          <Info label="Телефон" value={booking.guest.phone ?? '—'} />
          <Info label="Електронна пошта" value={booking.guest.email || '—'} />
          <Info
            label="Місто / країна"
            value={[booking.guest.city, booking.guest.country].filter(Boolean).join(', ') || '—'}
          />
          {booking.notes ? <Info label="Примітки до бронювання" value={booking.notes} /> : null}
          {booking.cancellationReason ? (
            <Info label="Причина скасування" value={booking.cancellationReason} />
          ) : null}
          {booking.cancelledAt ? <Info label="Скасовано" value={formatDateTime(booking.cancelledAt)} /> : null}
        </section>
      </div>

      <section className="border-t border-border pt-5">
        <h3 className="font-serif text-2xl">Послуги</h3>
        {booking.services.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Додаткових послуг немає.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {booking.services.map((service) => (
              <li key={service.id} className="flex justify-between py-2 text-sm">
                <span>
                  Послуга {service.serviceId.slice(0, 8)}…
                  <span className="ml-2 text-muted-foreground">× {service.quantity}</span>
                </span>
                <span className="tabular-nums">
                  {formatAdminBookingMoney(service.totalPrice, price.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {booking.nights.length > 0 ? (
        <section className="border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Ночі</h3>
          <ul className="mt-3 max-h-64 overflow-auto divide-y divide-border text-sm">
            {booking.nights.map((night) => (
              <li key={night.id} className="flex justify-between gap-4 py-2">
                <span>{formatDate(night.date)}</span>
                <span className="tabular-nums">{formatAdminBookingMoney(night.price, night.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-border pt-5">
        <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Сума</p>
        <p className="mt-2 font-serif text-4xl">
          {formatAdminBookingMoney(price.totalAmount, price.currency)}
        </p>
        <dl className="mt-4 max-w-sm space-y-1.5 text-sm">
          <Row label="Проживання" value={formatAdminBookingMoney(price.roomSubtotal, price.currency)} />
          <Row label="Послуги" value={formatAdminBookingMoney(price.servicesTotal, price.currency)} />
          <Row label="Знижка" value={formatAdminBookingMoney(price.discountAmount, price.currency)} />
          <Row label="Податок" value={formatAdminBookingMoney(price.taxAmount, price.currency)} />
        </dl>
      </section>

      <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => navigate('/admin/bookings')}>
        До списку бронювань
      </button>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скасувати бронювання</DialogTitle>
          </DialogHeader>
          <Field label="Причина">
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Необовʼязково" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Закрити
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => void runAction('cancel', reason)}
            >
              Скасувати бронювання
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'confirm'}
        title="Підтвердити бронювання"
        description="Статус зміниться на «Підтверджено»."
        confirmLabel="Підтвердити"
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('confirm')}
      />
      <ConfirmDialog
        open={confirm === 'check-in'}
        title="Заселити гостя"
        description="Статус зміниться на «Заселено»."
        confirmLabel="Заселити"
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('check-in')}
      />
      <ConfirmDialog
        open={confirm === 'check-out'}
        title="Виселити гостя"
        description="Проживання буде завершене."
        confirmLabel="Виселити"
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('check-out')}
      />
      <ConfirmDialog
        open={confirm === 'no-show'}
        title="Позначити як не заїхав"
        description="Номер звільниться для інших бронювань."
        confirmLabel="Не заїхав"
        destructive
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('no-show')}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
