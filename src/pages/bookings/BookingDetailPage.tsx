import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/states'
import { Textarea } from '@/components/ui/textarea'
import { useBooking, useBookingStatus, useGuests, useUpdatePayment } from '@/hooks/useBookings'
import { useAccommodations, usePolicies, useRatePlans, useRoomTypes, useServices } from '@/hooks/useHotel'
import { formatDate, formatGuests, formatMoney } from '@/lib/format'
import { bookingSourceLabel, paymentMethodLabel, paymentStatusLabel, serviceUnitLabel } from '@/lib/labels'
import { errorMessage } from '@/lib/errors'
import type { PaymentMethod, PaymentStatus } from '@/types'

export function BookingDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const bookingQuery = useBooking(id)
  const guests = useGuests()
  const accommodations = useAccommodations()
  const roomTypes = useRoomTypes()
  const ratePlans = useRatePlans()
  const policies = usePolicies()
  const services = useServices()
  const statusMutation = useBookingStatus(id)
  const paymentMutation = useUpdatePayment(id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState<null | 'check-in' | 'check-out' | 'no-show' | 'confirm'>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | '' | null>(null)

  if (
    bookingQuery.isLoading ||
    guests.isLoading ||
    accommodations.isLoading ||
    roomTypes.isLoading ||
    ratePlans.isLoading ||
    policies.isLoading ||
    services.isLoading
  ) {
    return <LoadingState />
  }
  if (!bookingQuery.data || !guests.data || !accommodations.data || !roomTypes.data || !ratePlans.data || !policies.data || !services.data) {
    return <p className="text-sm text-destructive">Бронювання не знайдено.</p>
  }

  const booking = bookingQuery.data
  const guest = guests.data.find((item) => item.id === booking.guestId)
  const place = accommodations.data.find((item) => item.id === booking.accommodationId)
  const roomType = roomTypes.data.find((item) => item.id === place?.roomTypeId)
  const plan = ratePlans.data.find((item) => item.id === booking.ratePlanId)
  const policy = policies.data.find((item) => item.id === plan?.cancellationPolicyId)
  const selectedServices = services.data.filter((item) => booking.serviceIds.includes(item.id))
  const closed = booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT' || booking.status === 'NO_SHOW'
  const currentPaymentStatus = paymentStatus ?? booking.paymentStatus
  const currentPaymentMethod = paymentMethod ?? (booking.paymentMethod === 'online' ? '' : booking.paymentMethod ?? '')

  async function runStatus(next: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED', cancelReason?: string) {
    try {
      await statusMutation.mutateAsync({ status: next, cancelReason })
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
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{booking.number}</p>
          <h2 className="mt-2 font-serif text-4xl font-medium">
            {guest ? `${guest.firstName} ${guest.lastName}` : 'Гість'}
          </h2>
          <div className="mt-3">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!closed ? (
            <Button variant="outline" asChild>
              <Link to={`/admin/bookings/${booking.id}/edit`}>Редагувати</Link>
            </Button>
          ) : null}
          {booking.status === 'PENDING' ? (
            <Button onClick={() => setConfirm('confirm')}>Підтвердити</Button>
          ) : null}
          {booking.status === 'CONFIRMED' ? (
            <Button onClick={() => setConfirm('check-in')}>Заселити</Button>
          ) : null}
          {booking.status === 'CHECKED_IN' ? (
            <Button onClick={() => setConfirm('check-out')}>Виселити</Button>
          ) : null}
          {booking.status === 'CONFIRMED' ? (
            <Button variant="outline" onClick={() => setConfirm('no-show')}>
              Не заїхав
            </Button>
          ) : null}
          {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
            <Button variant="ghost" onClick={() => setCancelOpen(true)}>
              Скасувати бронювання
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Проживання</h3>
          <Info label="Номер / будиночок" value={place ? `${place.name}${roomType ? ` · ${roomType.name}` : ''}` : '—'} />
          <Info label="Заїзд" value={`${formatDate(booking.checkIn)}, ${booking.checkInTime}`} />
          <Info label="Виїзд" value={`${formatDate(booking.checkOut)}, ${booking.checkOutTime}`} />
          <Info label="Гості" value={formatGuests(booking.adults, booking.children)} />
          <Info label="Тариф" value={plan?.name ?? '—'} />
          <Info label="Скасування" value={policy?.name ?? '—'} />
          <Info label="Джерело" value={bookingSourceLabel[booking.source]} />
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Гість</h3>
          <Info label="Телефон" value={guest?.phone ?? '—'} />
          <Info label="Електронна пошта" value={guest?.email || '—'} />
          {guest?.notes ? <Info label="Примітка" value={guest.notes} /> : null}
          {booking.notes ? <Info label="Примітки до бронювання" value={booking.notes} /> : null}
          {booking.cancelReason ? <Info label="Причина скасування" value={booking.cancelReason} /> : null}
        </section>
      </div>

      <section className="border-t border-border pt-5">
        <h3 className="font-serif text-2xl">Послуги</h3>
        {selectedServices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Додаткових послуг немає.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {selectedServices.map((service) => (
              <li key={service.id} className="flex justify-between py-2 text-sm">
                <span>
                  {service.name}
                  <span className="ml-2 text-muted-foreground">{serviceUnitLabel[service.unit]}</span>
                </span>
                <span className="tabular-nums">{formatMoney(service.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-8 border-t border-border pt-5 lg:grid-cols-[1fr_280px]">
        <div>
          <h3 className="font-serif text-2xl">Оплата</h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Онлайн-оплата ще не підключена. Статус можна зафіксувати вручну — готівка, термінал або рахунок.
          </p>
          <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
            <Field label="Статус оплати">
              <Select value={currentPaymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentStatusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Спосіб">
              <Select
                value={currentPaymentMethod || 'none'}
                onValueChange={(value) => setPaymentMethod(value === 'none' ? '' : (value as PaymentMethod))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не вказано</SelectItem>
                  <SelectItem value="cash">{paymentMethodLabel.cash}</SelectItem>
                  <SelectItem value="terminal">{paymentMethodLabel.terminal}</SelectItem>
                  <SelectItem value="invoice">{paymentMethodLabel.invoice}</SelectItem>
                  <SelectItem value="online" disabled>
                    Онлайн — незабаром
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button
            className="mt-4"
            variant="outline"
            disabled={paymentMutation.isPending}
            onClick={async () => {
              try {
                await paymentMutation.mutateAsync({
                  paymentStatus: currentPaymentStatus,
                  paymentMethod: currentPaymentStatus === 'unpaid' ? null : currentPaymentMethod || null,
                })
                toast.success('Оплату оновлено')
              } catch (error) {
                toast.error(errorMessage(error))
              }
            }}
          >
            Зберегти оплату
          </Button>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Сума</p>
          <p className="mt-2 font-serif text-4xl">{formatMoney(booking.totalAmount)}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Проживання" value={formatMoney(booking.accommodationAmount)} />
            <Row label="Послуги" value={formatMoney(booking.servicesAmount)} />
            <Row label="Знижка" value={formatMoney(booking.discountAmount)} />
          </dl>
        </div>
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
            <Button variant="destructive" disabled={statusMutation.isPending} onClick={() => void runStatus('CANCELLED', reason)}>
              Скасувати бронювання
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'confirm'}
        title="Підтвердити бронювання"
        description="Гість отримає підтверджений статус у системі."
        confirmLabel="Підтвердити"
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runStatus('CONFIRMED')}
      />
      <ConfirmDialog
        open={confirm === 'check-in'}
        title="Заселити гостя"
        description="Статус зміниться на «Заселено»."
        confirmLabel="Заселити"
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runStatus('CHECKED_IN')}
      />
      <ConfirmDialog
        open={confirm === 'check-out'}
        title="Виселити гостя"
        description="Проживання буде завершене."
        confirmLabel="Виселити"
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runStatus('CHECKED_OUT')}
      />
      <ConfirmDialog
        open={confirm === 'no-show'}
        title="Позначити як не заїхав"
        description="Номер звільниться для інших бронювань."
        confirmLabel="Не заїхав"
        destructive
        pending={statusMutation.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void runStatus('NO_SHOW')}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
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
