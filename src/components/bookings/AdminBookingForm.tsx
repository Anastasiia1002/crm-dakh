import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAdminBookingGuests, useAdminBookingQuote } from '@/hooks/useBookings'
import { useAuth } from '@/hooks/useAuth'
import {
  buildAdminBookingCreateInput,
  buildAdminBookingUpdateInput,
  canEditAdminBookingCommercial,
  canEditAdminBookingProfile,
  canReassignAdminBookingRoom,
  formatAdminBookingMoney,
  guestCountFromOccupancy,
} from '@/lib/admin-booking-view'
import { addCalendarDays, roomDisplayName } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import type {
  Accommodation,
  AdminBookingCreateInput,
  AdminBookingDetail,
  AdminBookingUpdateInput,
  RatePlan,
} from '@/types'

type Props = {
  booking?: AdminBookingDetail
  rooms: Accommodation[]
  ratePlans: RatePlan[]
  preset?: { roomId?: string; checkIn?: string; checkOut?: string }
  submitting: boolean
  onSubmit: (input: AdminBookingCreateInput | AdminBookingUpdateInput) => Promise<void>
}

export function AdminBookingForm({ booking, rooms, ratePlans, preset, submitting, onSubmit }: Props) {
  const { user } = useAuth()
  const isEdit = Boolean(booking)
  const commercial = !booking || canEditAdminBookingCommercial(booking.status)
  const profile = !booking || canEditAdminBookingProfile(booking.status)
  const canReassign = canReassignAdminBookingRoom(user?.role)

  const [guestMode, setGuestMode] = useState<'existing' | 'new'>(booking ? 'new' : 'new')
  const [guestSearch, setGuestSearch] = useState('')
  const [guestId, setGuestId] = useState(booking?.guest.id ?? '')
  const [firstName, setFirstName] = useState(booking?.guest.firstName ?? '')
  const [lastName, setLastName] = useState(booking?.guest.lastName ?? '')
  const [phone, setPhone] = useState(booking?.guest.phone ?? '')
  const [email, setEmail] = useState(booking?.guest.email ?? '')
  const [roomId, setRoomId] = useState(booking?.rooms[0]?.roomId ?? preset?.roomId ?? '')
  const [ratePlanId, setRatePlanId] = useState(booking?.rooms[0]?.ratePlanId ?? '')
  const [checkIn, setCheckIn] = useState(booking?.checkIn ?? preset?.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(
    booking?.checkOut ?? preset?.checkOut ?? (preset?.checkIn ? addCalendarDays(preset.checkIn, 1) : ''),
  )
  const [adults, setAdults] = useState(booking?.adults ?? 1)
  const [children, setChildren] = useState(booking?.children ?? 0)
  const [notes, setNotes] = useState(booking?.notes ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const submitLock = useRef(false)

  const guestsQuery = useAdminBookingGuests(guestSearch, { enabled: guestMode === 'existing' })
  const guestCount = guestCountFromOccupancy(adults, children)

  const quoteInput = useMemo(() => {
    if (!commercial) return null
    if (!checkIn || !checkOut || !roomId || !ratePlanId) return null
    if (checkOut <= checkIn) return null
    return {
      checkIn,
      checkOut,
      guestCount,
      rooms: [{ roomId, ratePlanId }],
    }
  }, [checkIn, checkOut, commercial, guestCount, ratePlanId, roomId])

  const quoteQuery = useAdminBookingQuote(quoteInput)

  const activePlans = ratePlans.filter((plan) => plan.active || plan.id === ratePlanId)
  const roomLocked = isEdit && (!commercial || !canReassign)

  useEffect(() => {
    if (guestMode !== 'existing' || !guestId) return
    const selected = guestsQuery.data?.items.find((item) => item.id === guestId)
    if (!selected) return
    setFirstName(selected.firstName)
    setLastName(selected.lastName)
    setPhone(selected.phone ?? '')
    setEmail(selected.email ?? '')
  }, [guestId, guestMode, guestsQuery.data?.items])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || submitLock.current) return
    setFormError(null)

    if (booking) {
      const result = buildAdminBookingUpdateInput({
        booking,
        role: user?.role,
        guestMode: guestMode === 'existing' ? 'existing' : 'keep',
        guestId,
        guest: { firstName, lastName, phone, email },
        checkIn,
        checkOut,
        adults,
        children,
        roomId,
        ratePlanId,
        notes,
      })
      if ('error' in result) {
        setFormError(result.error)
        return
      }
      submitLock.current = true
      try {
        await onSubmit(result)
      } catch (error) {
        setFormError(errorMessage(error))
      } finally {
        submitLock.current = false
      }
      return
    }

    if (!quoteQuery.data || quoteQuery.isError || quoteQuery.isFetching) {
      setFormError('Дочекайтесь успішного розрахунку вартості перед збереженням.')
      return
    }

    const result = buildAdminBookingCreateInput({
      guestMode,
      guestId,
      guest: { firstName, lastName, phone, email },
      checkIn,
      checkOut,
      adults,
      children,
      roomId,
      ratePlanId,
      notes,
    })
    if ('error' in result) {
      setFormError(result.error)
      return
    }
    submitLock.current = true
    try {
      await onSubmit(result)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      submitLock.current = false
    }
  }

  if (booking && !commercial && !profile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Це бронювання не можна редагувати.</p>
        <Button asChild variant="outline">
          <Link to={`/admin/bookings/${booking.id}`}>До деталей</Link>
        </Button>
      </div>
    )
  }

  const createBlocked = !isEdit && (!quoteQuery.data || quoteQuery.isFetching || quoteQuery.isError)

  return (
    <form className="mx-auto max-w-3xl space-y-8 px-1 sm:px-0" onSubmit={(event) => void handleSubmit(event)}>
      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="font-serif text-2xl">Гість</h3>
        {profile ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={guestMode === 'new' ? 'default' : 'outline'}
                onClick={() => setGuestMode('new')}
              >
                {isEdit ? 'Поточний гість' : 'Новий гість'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={guestMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setGuestMode('existing')}
              >
                {isEdit ? 'Інший гість' : 'Існуючий гість'}
              </Button>
            </div>
            {guestMode === 'existing' ? (
              <div className="space-y-3">
                <Field label="Пошук">
                  <Input
                    value={guestSearch}
                    onChange={(event) => setGuestSearch(event.target.value)}
                    placeholder="Прізвище, телефон або email"
                  />
                </Field>
                <Field label="Гість">
                  <Select value={guestId || undefined} onValueChange={setGuestId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть гостя" />
                    </SelectTrigger>
                    <SelectContent>
                      {(guestsQuery.data?.items ?? []).map((guest) => (
                        <SelectItem key={guest.id} value={guest.id}>
                          {guest.lastName} {guest.firstName}
                          {guest.phone ? ` · ${guest.phone}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {guestsQuery.isError ? (
                  <p className="text-sm text-destructive">{errorMessage(guestsQuery.error)}</p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Імʼя">
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={guestMode === 'existing'} />
              </Field>
              <Field label="Прізвище">
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={guestMode === 'existing'} />
              </Field>
              <Field label="Телефон">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={guestMode === 'existing'} />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={guestMode === 'existing'}
                />
              </Field>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Дані гостя недоступні для редагування в цьому статусі.</p>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="font-serif text-2xl">Проживання</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Заїзд">
            <Input
              type="date"
              value={checkIn}
              disabled={!commercial}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </Field>
          <Field label="Виїзд">
            <Input
              type="date"
              value={checkOut}
              disabled={!commercial}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </Field>
          <Field label="Номер / будиночок">
            <Select value={roomId || undefined} onValueChange={setRoomId} disabled={roomLocked}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть розміщення" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {roomDisplayName(room)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && !canReassign ? (
              <p className="mt-1 text-[11px] text-muted-foreground">Ресепшен не може змінювати номер.</p>
            ) : null}
          </Field>
          <Field label="Тариф">
            <Select value={ratePlanId || undefined} onValueChange={setRatePlanId} disabled={!commercial}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть тариф" />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Дорослі">
            <Input
              type="number"
              min={1}
              value={adults}
              disabled={!commercial}
              onChange={(event) => setAdults(Number(event.target.value) || 0)}
            />
          </Field>
          <Field label="Діти">
            <Input
              type="number"
              min={0}
              value={children}
              disabled={!commercial}
              onChange={(event) => setChildren(Number(event.target.value) || 0)}
            />
          </Field>
          <Field label="Кількість гостей (guestCount)">
            <Input type="number" value={guestCount} readOnly disabled className="bg-surface-muted" />
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">
          guestCount = дорослі + діти (мінімум 1). Це значення передається в quote і create.
        </p>
      </section>

      {profile ? (
        <section className="space-y-4 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Примітки</h3>
          <Field label="Нотатки">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </section>
      ) : null}

      {commercial ? (
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Вартість (сервер)</h3>
          {quoteQuery.isFetching ? <p className="text-sm text-muted-foreground">Розрахунок…</p> : null}
          {quoteQuery.isError ? (
            <p className="text-sm text-destructive">{errorMessage(quoteQuery.error)}</p>
          ) : null}
          {quoteQuery.data ? (
            <div>
              <p className="font-serif text-3xl">
                {formatAdminBookingMoney(quoteQuery.data.price.totalAmount, quoteQuery.data.price.currency)}
              </p>
              <dl className="mt-3 max-w-sm space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Проживання</dt>
                  <dd className="tabular-nums">
                    {formatAdminBookingMoney(quoteQuery.data.price.roomSubtotal, quoteQuery.data.price.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Знижка</dt>
                  <dd className="tabular-nums">
                    {formatAdminBookingMoney(quoteQuery.data.price.discountAmount, quoteQuery.data.price.currency)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Остаточна сума підтверджується сервером під час збереження.
              </p>
            </div>
          ) : !quoteQuery.isFetching && quoteInput ? null : (
            <p className="text-sm text-muted-foreground">Оберіть дати, номер і тариф для розрахунку.</p>
          )}
        </section>
      ) : null}

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="submit" disabled={submitting || createBlocked} className="w-full sm:w-auto">
          {submitting ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Створити бронювання'}
        </Button>
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
          <Link to={booking ? `/admin/bookings/${booking.id}` : '/admin/bookings'}>Скасувати</Link>
        </Button>
      </div>
      {createBlocked && !isEdit ? (
        <p className="text-sm text-muted-foreground">Кнопка створення активна лише після успішного quote.</p>
      ) : null}
    </form>
  )
}
