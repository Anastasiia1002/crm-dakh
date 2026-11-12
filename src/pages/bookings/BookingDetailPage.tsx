import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { BookingDetailActions } from '@/components/bookings/BookingDetailActions'
import { BookingFinancePanel } from '@/components/bookings/BookingFinancePanel'
import { BookingGuestPanel } from '@/components/bookings/BookingGuestPanel'
import { BookingStaySummary } from '@/components/bookings/BookingStaySummary'
import { BookingMeta, BookingWorkspaceSection } from '@/components/bookings/BookingWorkspaceSection'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { PageSkeleton, QueryErrorState } from '@/components/ui/page-status'
import { PendingOverlay } from '@/components/ui/pending-overlay'
import { Textarea } from '@/components/ui/textarea'
import { useAdminServices } from '@/hooks/useAdminServices'
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
import { bookingStatusDialog } from '@/lib/booking-detail-actions'
import {
  bookingStayNightCopy,
  bookingWorkspaceHasCancellation,
  bookingWorkspaceHasNotes,
} from '@/lib/booking-detail-workspace'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { serviceDisplayName } from '@/lib/admin-services'
import { formatDate, formatDateTime, formatGuests } from '@/lib/format'
import { adminBookingSourceLabel } from '@/lib/labels'
import { canCancelBookings } from '@/lib/roles'
import type { AdminBookingStatusAction } from '@/types'

export function BookingDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const bookingQuery = useAdminBooking(id)
  const servicesCatalog = useAdminServices()
  const statusMutation = useAdminBookingStatus(id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState<Exclude<AdminBookingStatusAction, 'cancel'> | null>(null)
  const [phase, setPhase] = useState<Extract<MutationPhase, 'idle' | 'submitting' | 'uncertain'>>('idle')
  const [kind, setKind] = useState<MutationKind>('status')
  const actionLock = useRef(createSubmitLock())
  const confirmRef = useRef<HTMLButtonElement>(null)
  const checkInRef = useRef<HTMLButtonElement>(null)
  const checkOutRef = useRef<HTMLButtonElement>(null)
  const noShowRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
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
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/bookings')}>
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
  const actions = adminBookingStatusActions(booking.status).filter(
    (action) => action !== 'cancel' || canCancelBookings(user?.role),
  )
  const closed = isAdminBookingTerminal(booking.status)
  const canEdit = canEditAdminBookingProfile(booking.status)
  const canMove = canEditAdminBookingCommercial(booking.status) && canReassignAdminBookingRoom(user?.role)
  const notes = bookingWorkspaceHasNotes(booking)
  const cancellation = bookingWorkspaceHasCancellation(booking)

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
    <div className="mx-auto max-w-6xl space-y-4" aria-busy={pending || undefined}>
      {phase === 'submitting' || phase === 'uncertain' ? (
        <PendingOverlay
          kind={kind}
          phase={phase}
          onStopWaiting={phase === 'uncertain' ? () => setPhase('idle') : undefined}
          onCheckList={phase === 'uncertain' ? () => navigate('/admin/bookings') : undefined}
        />
      ) : null}

      <header className="space-y-3">
        <Link
          to="/admin/bookings"
          className="inline-flex min-h-8 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Бронювання
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-sans text-xs font-medium tracking-[0.08em] text-muted uppercase" title={booking.id}>
                {adminBookingRef(booking.id)}
              </p>
              <BookingStatusBadge status={booking.status} />
            </div>
            <h1 className="font-serif text-2xl leading-tight font-medium md:text-[1.75rem]">
              {adminGuestName(booking.guest)}
            </h1>
          </div>
          <BookingDetailActions
            editTo={`/admin/bookings/${booking.id}/edit`}
            canEdit={canEdit && !closed}
            canMove={canMove}
            actions={actions}
            pending={pending}
            busyAction={pending ? (cancelOpen ? 'cancel' : confirm) : null}
            confirmRef={confirmRef}
            checkInRef={checkInRef}
            checkOutRef={checkOutRef}
            noShowRef={noShowRef}
            cancelRef={cancelRef}
            onConfirm={() => setConfirm('confirm')}
            onCheckIn={() => setConfirm('check-in')}
            onCheckOut={() => setConfirm('check-out')}
            onNoShow={() => setConfirm('no-show')}
            onCancel={() => setCancelOpen(true)}
          />
        </div>
      </header>

      <BookingStaySummary
        checkIn={formatDate(booking.checkIn)}
        checkOut={formatDate(booking.checkOut)}
        nights={bookingStayNightCopy(booking.checkIn, booking.checkOut)}
        guests={formatGuests(booking.adults, booking.children)}
        accommodation={adminRoomsLabel(booking.rooms)}
        source={adminBookingSourceLabel[booking.source]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.9fr)]">
        <div className="space-y-4">
          <BookingWorkspaceSection title="Проживання">
            <BookingMeta label="Номер / будиночок" value={adminRoomsLabel(booking.rooms)} />
            <div className="grid grid-cols-2 gap-3">
              <BookingMeta label="Заїзд" value={formatDate(booking.checkIn)} />
              <BookingMeta label="Виїзд" value={formatDate(booking.checkOut)} />
            </div>
            <BookingMeta label="Гості" value={formatGuests(booking.adults, booking.children)} />
            <BookingMeta label="У бронюванні" value={String(booking.guestCount)} />
            <BookingMeta label="Джерело" value={adminBookingSourceLabel[booking.source]} />
            <BookingMeta label="Створено" value={formatDateTime(booking.createdAt)} />
          </BookingWorkspaceSection>

          <BookingGuestPanel guest={booking.guest} />

          <BookingWorkspaceSection title="Послуги">
            {booking.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Додаткових послуг немає.</p>
            ) : (
              <ul className="divide-y divide-border">
                {booking.services.map((service) => (
                  <li key={service.id} className="flex justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                    <span>
                      {serviceDisplayName(service.serviceId, servicesCatalog.data ?? [])}
                      <span className="ml-2 text-muted-foreground">× {service.quantity}</span>
                    </span>
                    <span className="tabular-nums">
                      {formatAdminBookingMoney(service.totalPrice, price.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BookingWorkspaceSection>

          {booking.nights.length > 0 ? (
            <BookingWorkspaceSection title="Ночі">
              <ul className="max-h-56 overflow-auto divide-y divide-border text-sm">
                {booking.nights.map((night) => (
                  <li key={night.id} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <span>{formatDate(night.date)}</span>
                    <span className="tabular-nums">{formatAdminBookingMoney(night.price, night.currency)}</span>
                  </li>
                ))}
              </ul>
            </BookingWorkspaceSection>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <BookingFinancePanel price={price} />
          {notes ? (
            <BookingWorkspaceSection title="Примітки до бронювання">
              <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
            </BookingWorkspaceSection>
          ) : null}
          {cancellation ? (
            <BookingWorkspaceSection title="Скасування">
              {booking.cancellationReason ? (
                <BookingMeta label="Причина скасування" value={booking.cancellationReason} />
              ) : null}
              {booking.cancelledAt ? <BookingMeta label="Скасовано" value={formatDateTime(booking.cancelledAt)} /> : null}
            </BookingWorkspaceSection>
          ) : null}
        </aside>
      </div>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!open && pending) return
          setCancelOpen(open)
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            cancelRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{bookingStatusDialog('cancel', adminBookingRef(booking.id)).title}</DialogTitle>
            <DialogDescription>
              {bookingStatusDialog('cancel', adminBookingRef(booking.id)).description}
            </DialogDescription>
          </DialogHeader>
          <Field label="Причина">
            <Textarea
              value={reason}
              disabled={pending}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Необовʼязково"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" size="lg" className="min-h-11" onClick={() => setCancelOpen(false)} disabled={pending}>
              Не скасовувати
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="min-h-11"
              disabled={pending}
              loading={pending && kind === 'cancel'}
              onClick={() => void runAction('cancel', reason)}
            >
              Скасувати бронювання
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(['confirm', 'check-in', 'check-out', 'no-show'] as const).map((action) => {
        const dialog = bookingStatusDialog(action, adminBookingRef(booking.id))
        const returnFocusRef =
          action === 'confirm' ? confirmRef : action === 'check-in' ? checkInRef : action === 'check-out' ? checkOutRef : noShowRef
        return (
          <ConfirmDialog
            key={action}
            open={confirm === action}
            title={dialog.title}
            description={dialog.description}
            confirmLabel={dialog.confirmLabel}
            pending={pending}
            returnFocusRef={returnFocusRef}
            onOpenChange={(open) => !open && setConfirm(null)}
            onConfirm={() => void runAction(action)}
          />
        )
      })}
    </div>
  )
}
