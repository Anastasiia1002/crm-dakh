import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { PageSkeleton, QueryErrorState } from '@/components/ui/page-status'
import { PendingOverlay } from '@/components/ui/pending-overlay'
import { Textarea } from '@/components/ui/textarea'
import { useAdminBooking, useAdminBookingStatus } from '@/hooks/useBookings'
import { useAuth } from '@/hooks/useAuth'
import {
  adminBookingRef,
  adminBookingStatusActions,
  adminGuestName,
  adminRoomsLabel,
  canEditAdminBookingCommercial,
  canEditAdminBookingProfile,
  canReassignAdminBookingRoom,
  formatAdminBookingMoney,
  isAdminBookingTerminal,
} from '@/lib/admin-booking-view'
import { createSubmitLock } from '@/lib/booking-form'
import { classifyMutationFailure, type MutationKind, type MutationPhase } from '@/lib/mutation-action'
import { statusOccupancyImpact } from '@/lib/booking-manage'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime, formatGuests } from '@/lib/format'
import { adminBookingSourceLabel } from '@/lib/labels'
import type { AdminBookingStatusAction } from '@/types'

export function BookingDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const bookingQuery = useAdminBooking(id)
  const statusMutation = useAdminBookingStatus(id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState<Exclude<AdminBookingStatusAction, 'cancel'> | null>(null)
  const [phase, setPhase] = useState<Extract<MutationPhase, 'idle' | 'submitting' | 'uncertain'>>('idle')
  const [kind, setKind] = useState<MutationKind>('status')
  const actionLock = useRef(createSubmitLock())
  const pending = statusMutation.isPending || phase === 'submitting' || phase === 'uncertain'
  const blocker = useBlocker(phase === 'submitting')

  useEffect(() => {
    if (phase !== 'submitting') return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [phase])

  useEffect(() => {
    if (phase !== 'submitting' && blocker.state === 'blocked') blocker.proceed()
  }, [blocker, phase])

  if (bookingQuery.isLoading && !bookingQuery.data) return <PageSkeleton label="Завантажуємо бронювання…" />

  if (bookingQuery.isError) {
    const notFound = bookingQuery.error instanceof ApiError && bookingQuery.error.status === 404
    if (notFound) {
      return (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">Бронювання не знайдено.</p>
          <Button size="sm" variant="ghost" onClick={() => navigate('/admin/bookings')}>
            До списку
          </Button>
        </div>
      )
    }
    return (
      <QueryErrorState
        title="Не вдалося завантажити бронювання."
        error={bookingQuery.error}
        onRetry={() => void bookingQuery.refetch()}
      />
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
  const canMove = canEditAdminBookingCommercial(booking.status) && canReassignAdminBookingRoom(user?.role)

  async function runAction(action: AdminBookingStatusAction, cancellationReason?: string) {
    if (pending || !actionLock.current.tryBegin()) return
    const nextKind: MutationKind = action === 'cancel' ? 'cancel' : 'status'
    setKind(nextKind)
    setPhase('submitting')
    try {
      await statusMutation.mutateAsync({
        action,
        cancel: cancellationReason ? { cancellationReason } : undefined,
      })
      setPhase('idle')
      toast.success('Статус оновлено')
      setConfirm(null)
      setCancelOpen(false)
      setReason('')
    } catch (error) {
      if (classifyMutationFailure(nextKind, error) === 'uncertain') {
        setPhase('uncertain')
        return
      }
      setPhase('idle')
      toast.error(errorMessage(error))
    } finally {
      actionLock.current.end()
    }
  }

  return (
    <div className="max-w-5xl space-y-10" aria-busy={pending || undefined}>
      {phase === 'submitting' || phase === 'uncertain' ? (
        <PendingOverlay
          kind={kind}
          phase={phase}
          onStopWaiting={phase === 'uncertain' ? () => setPhase('idle') : undefined}
          onCheckList={phase === 'uncertain' ? () => navigate('/admin/bookings') : undefined}
        />
      ) : null}
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
          {canMove ? (
            <Button variant="outline" asChild>
              <Link to={`/admin/bookings/${booking.id}/edit`}>Змінити розміщення</Link>
            </Button>
          ) : null}
          {actions.includes('confirm') ? (
            <Button disabled={pending} onClick={() => setConfirm('confirm')}>Підтвердити</Button>
          ) : null}
          {actions.includes('check-in') ? (
            <Button disabled={pending} onClick={() => setConfirm('check-in')}>Заселити</Button>
          ) : null}
          {actions.includes('check-out') ? (
            <Button disabled={pending} onClick={() => setConfirm('check-out')}>Виселити</Button>
          ) : null}
          {actions.includes('no-show') ? (
            <Button variant="outline" disabled={pending} onClick={() => setConfirm('no-show')}>
              Не заїхав
            </Button>
          ) : null}
          {actions.includes('cancel') ? (
            <Button variant="ghost" disabled={pending} onClick={() => setCancelOpen(true)}>
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
          <p className="text-sm text-muted-foreground">{statusOccupancyImpact('cancel')}</p>
          <Field label="Причина">
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Необовʼязково" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Закрити
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              loading={pending && kind === 'cancel'}
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
        description={statusOccupancyImpact('confirm')}
        confirmLabel="Підтвердити"
        pending={pending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('confirm')}
      />
      <ConfirmDialog
        open={confirm === 'check-in'}
        title="Заселити гостя"
        description={statusOccupancyImpact('check-in')}
        confirmLabel="Заселити"
        pending={pending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('check-in')}
      />
      <ConfirmDialog
        open={confirm === 'check-out'}
        title="Виселити гостя"
        description={statusOccupancyImpact('check-out')}
        confirmLabel="Виселити"
        pending={pending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runAction('check-out')}
      />
      <ConfirmDialog
        open={confirm === 'no-show'}
        title="Позначити як не заїхав"
        description={statusOccupancyImpact('no-show')}
        confirmLabel="Не заїхав"
        destructive
        pending={pending}
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
