import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { StayCalendar } from '@/components/bookings/StayCalendar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { listAdminBookingGuests, quoteAdminBooking } from '@/api/admin-bookings'
import { getAdminCalendar } from '@/api/availability'
import { useAdminBookingQuote } from '@/hooks/useBookings'
import { useAuth } from '@/hooks/useAuth'
import { useHotelBookingSettings, useHotelSettings } from '@/hooks/useHotel'
import {
  applyGuestFill,
  bookingConflictMessage,
  createSubmitLock,
  hasFieldErrors,
  proposeGuestFill,
  stayNightCount,
  validateGuestFields,
  validateStayFields,
  type FieldErrors,
  type GuestCard,
} from '@/lib/booking-form'
import {
  buildAdminBookingCreateInput,
  buildAdminBookingUpdateInput,
  canEditAdminBookingCommercial,
  canEditAdminBookingProfile,
  canReassignAdminBookingRoom,
  formatAdminBookingMoney,
  guestCountFromOccupancy,
} from '@/lib/admin-booking-view'
import { roomsOfferedForStay, stayPriceDifference } from '@/lib/booking-manage'
import { ApiError } from '@/lib/api-error'
import { bookingRoomFilterLabel } from '@/lib/accommodation-labels'
import { errorMessage } from '@/lib/errors'
import { adminBookingServicesBlockedMessage } from '@/lib/admin-services'
import { normalizePhone, phonesMatch } from '@/lib/phone'
import {
  HOTEL_TIME_ZONE,
  checkInPolicyError,
  createStayPreset,
  kyivTodayIso,
  reconcileStayDates,
  storedStayDatesUnchanged,
  monthKey,
  calendarNightMaps,
  monthQueryRange,
  nightsLabel,
  roomNightMap,
  selectStayDate,
  stayNightsAvailable,
  type NightAvailability,
} from '@/lib/stay-calendar'
import type {
  Accommodation,
  AdminBookingCreateInput,
  AdminBookingDetail,
  AdminBookingGuest,
  AdminBookingUpdateInput,
  RatePlan,
  RoomType,
} from '@/types'

type Props = {
  booking?: AdminBookingDetail
  rooms: Accommodation[]
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
  preset?: { roomId?: string; checkIn?: string; checkOut?: string }
  submitting: boolean
  onCreateActivity?: (active: boolean) => void
  onSubmit: (input: AdminBookingCreateInput | AdminBookingUpdateInput) => Promise<void>
}

export function AdminBookingForm({
  booking,
  rooms,
  roomTypes,
  ratePlans,
  preset,
  submitting,
  onCreateActivity,
  onSubmit,
}: Props) {
  const { user } = useAuth()
  const hotelQuery = useHotelSettings()
  const policyQuery = useHotelBookingSettings()
  const isEdit = Boolean(booking)
  const commercial = !booking || canEditAdminBookingCommercial(booking.status)
  const profile = !booking || canEditAdminBookingProfile(booking.status)
  const canReassign = canReassignAdminBookingRoom(user?.role)

  const [guestMode, setGuestMode] = useState<'existing' | 'new'>('new')
  const [guestId, setGuestId] = useState(booking?.guest.id ?? '')
  const [firstName, setFirstName] = useState(booking?.guest.firstName ?? '')
  const [lastName, setLastName] = useState(booking?.guest.lastName ?? '')
  const [phone, setPhone] = useState(booking?.guest.phone ?? '')
  const [email, setEmail] = useState(booking?.guest.email ?? '')
  const [matches, setMatches] = useState<GuestCard[]>([])
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [pendingGuest, setPendingGuest] = useState<GuestCard | null>(null)
  const [roomId, setRoomId] = useState(booking?.rooms[0]?.roomId ?? preset?.roomId ?? '')
  const [ratePlanId, setRatePlanId] = useState(booking?.rooms[0]?.ratePlanId ?? '')
  const [initialStay] = useState(() =>
    booking
      ? { checkIn: booking.checkIn, checkOut: booking.checkOut }
      : createStayPreset({
          checkIn: preset?.checkIn,
          checkOut: preset?.checkOut,
          today: kyivTodayIso(),
          allowSameDay: true,
        }),
  )
  const [checkIn, setCheckIn] = useState(initialStay.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(initialStay.checkOut ?? '')
  const [adults, setAdults] = useState(booking?.adults ?? 2)
  const [children, setChildren] = useState(booking?.children ?? 0)
  const [notes, setNotes] = useState(booking?.notes ?? '')
  const [calendarMonth, setCalendarMonth] = useState(monthKey(initialStay.checkIn || kyivTodayIso()))
  const [clock, setClock] = useState(() => new Date())
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showErrors, setShowErrors] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [promoDraft, setPromoDraft] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [promoCleared, setPromoCleared] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [pendingPatch, setPendingPatch] = useState<AdminBookingUpdateInput | null>(null)
  const submitLock = useRef(createSubmitLock())

  const selectedRoom = rooms.find((room) => room.id === roomId)
  const roomType = roomTypes.find((type) => type.id === selectedRoom?.roomTypeId)
  const maxGuests = roomType?.maxGuests ?? null
  const guestCount = guestCountFromOccupancy(adults, children)
  const activePlans = ratePlans.filter((plan) => plan.active || plan.id === ratePlanId)
  const roomLocked = isEdit && (!commercial || !canReassign)
  const timeZone = hotelQuery.data?.timezone || HOTEL_TIME_ZONE
  const rules = policyQuery.data
    ? {
        timeZone,
        minAdvanceHours: policyQuery.data.minAdvanceHours,
        maxAdvanceDays: policyQuery.data.maxAdvanceDays,
        allowSameDayBooking: policyQuery.data.allowSameDayBooking,
        defaultMinStay: policyQuery.data.defaultMinStay,
        defaultMaxStay: policyQuery.data.defaultMaxStay,
      }
    : null

  const visibleRange = monthQueryRange(calendarMonth)
  const calendarQuery = useQuery({
    queryKey: ['admin-stay-calendar', roomId, visibleRange.from, visibleRange.to],
    enabled: Boolean(roomId && commercial),
    queryFn: ({ signal }) =>
      getAdminCalendar(
        {
          from: visibleRange.from,
          to: visibleRange.to,
          roomTypeId: selectedRoom?.roomTypeId,
          active: true,
        },
        signal,
      ),
  })

  const ownBookingId = booking?.id
  const nightKinds = useMemo(
    () => roomNightMap(calendarQuery.data?.roomTypes, roomId, ownBookingId),
    [calendarQuery.data, ownBookingId, roomId],
  )
  const rangeQuery = useQuery({
    queryKey: ['admin-stay-range', roomId, checkIn, checkOut],
    enabled: Boolean(commercial && roomId && checkIn && checkOut && checkOut > checkIn),
    queryFn: ({ signal }) =>
      getAdminCalendar(
        {
          from: checkIn,
          to: checkOut,
          roomTypeId: selectedRoom?.roomTypeId,
          active: true,
        },
        signal,
      ),
  })
  const rangeNights = useMemo(
    () => (rangeQuery.data ? roomNightMap(rangeQuery.data.roomTypes, roomId, ownBookingId) : null),
    [ownBookingId, rangeQuery.data, roomId],
  )
  const currentRoom = booking?.rooms[0]
  const stayChanged = Boolean(
    booking &&
      commercial &&
      currentRoom &&
      (checkIn !== booking.checkIn ||
        checkOut !== booking.checkOut ||
        roomId !== currentRoom.roomId ||
        ratePlanId !== currentRoom.ratePlanId),
  )
  const offerQuery = useQuery({
    queryKey: ['admin-stay-offers', checkIn, checkOut, ownBookingId],
    enabled: Boolean(commercial && checkIn && checkOut && checkOut > checkIn),
    queryFn: ({ signal }) => getAdminCalendar({ from: checkIn, to: checkOut, active: true }, signal),
  })
  const offeredRoomIds = useMemo(() => {
    if (!offerQuery.data || !checkIn || !checkOut) return null
    const capacityByRoom = new Map(rooms.map((room) => [room.id, roomTypes.find((type) => type.id === room.roomTypeId)?.maxGuests ?? Number.POSITIVE_INFINITY]))
    return roomsOfferedForStay({
      roomIds: rooms.map((room) => room.id),
      nightsByRoom: calendarNightMaps(offerQuery.data.roomTypes, ownBookingId),
      checkIn,
      checkOut,
      guestCount,
      capacityByRoom,
      selectedRoomId: roomId || undefined,
    })
  }, [checkIn, checkOut, guestCount, offerQuery.data, ownBookingId, roomId, roomTypes, rooms])
  const roomChoices = offeredRoomIds ? rooms.filter((room) => offeredRoomIds.includes(room.id)) : rooms

  const promoTouched = appliedPromo !== null || promoCleared
  const quoteInput = useMemo(() => {
    if (!commercial || !checkIn || !checkOut || !roomId || !ratePlanId || checkOut <= checkIn) return null
    if (isEdit && !stayChanged && !promoTouched) return null
    return {
      checkIn,
      checkOut,
      guestCount,
      rooms: [{ roomId, ratePlanId }],
      ...(ownBookingId ? { excludeBookingId: ownBookingId } : {}),
      ...(appliedPromo !== null ? { promoCode: appliedPromo } : promoCleared ? { promoCode: '' } : {}),
    }
  }, [appliedPromo, checkIn, checkOut, commercial, guestCount, isEdit, ownBookingId, promoCleared, promoTouched, ratePlanId, roomId, stayChanged])
  const quoteQuery = useAdminBookingQuote(quoteInput)

  const hotelToday = kyivTodayIso(clock, rules?.timeZone ?? HOTEL_TIME_ZONE)
  useEffect(() => {
    const tick = () => setClock(new Date())
    const timer = window.setInterval(tick, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  const storedStay =
    booking?.checkIn && booking.checkOut ? { checkIn: booking.checkIn, checkOut: booking.checkOut } : null
  const datesUnchanged = storedStayDatesUnchanged(storedStay, checkIn, checkOut)
  useEffect(() => {
    const stored =
      booking?.checkIn && booking.checkOut ? { checkIn: booking.checkIn, checkOut: booking.checkOut } : null
    if (!commercial || !checkIn || storedStayDatesUnchanged(stored, checkIn, checkOut)) return
    const policy = rules
      ? checkInPolicyError(checkIn, rules, clock)
      : checkIn < hotelToday
        ? 'Дата заїзду не може бути в минулому.'
        : null
    const orderError = !policy && checkOut && checkOut <= checkIn ? 'Виїзд має бути пізніше заїзду.' : null
    const next = reconcileStayDates({
      checkIn,
      checkOut,
      stored,
      policyError: policy ?? orderError,
    })
    if (next.checkIn !== checkIn) setCheckIn(next.checkIn)
    if (next.checkOut !== checkOut) setCheckOut(next.checkOut)
    if (next.error) setSelectionError(next.error)
  }, [booking?.checkIn, booking?.checkOut, checkIn, checkOut, clock, commercial, hotelToday, rules])

  const solePlanId = activePlans.length === 1 ? activePlans[0].id : ''
  useEffect(() => {
    if (!ratePlanId && solePlanId) setRatePlanId(solePlanId)
  }, [ratePlanId, solePlanId])

  const draftErrors = useMemo(() => {
    const guestErrors = profile
      ? validateGuestFields({ firstName, lastName, phone, email })
      : {}
    const stayErrors = commercial
      ? validateStayFields({
          checkIn,
          checkOut,
          roomId,
          roomActive: selectedRoom ? selectedRoom.active : false,
          ratePlanId,
          guestCount: adults < 1 ? 0 : guestCount,
          maxGuests,
          notes,
          rules: datesUnchanged ? null : rules,
          nights: datesUnchanged && roomId === (booking?.rooms[0]?.roomId ?? roomId) ? null : rangeNights,
          now: clock,
        })
      : validateStayFields({
          checkIn,
          checkOut,
          roomId,
          roomActive: true,
          ratePlanId: ratePlanId || 'kept',
          guestCount,
          maxGuests: null,
          notes,
          rules: null,
          nights: null,
        })
    if (!commercial) {
      delete stayErrors.ratePlanId
      delete stayErrors.checkIn
      delete stayErrors.checkOut
      delete stayErrors.roomId
      delete stayErrors.guestCount
    }
    return { ...guestErrors, ...stayErrors }
  }, [
    adults,
    clock,
    checkIn,
    checkOut,
    commercial,
    datesUnchanged,
    email,
    firstName,
    guestCount,
    lastName,
    maxGuests,
    notes,
    rangeNights,
    phone,
    profile,
    ratePlanId,
    roomId,
    rules,
    selectedRoom,
  ])

  const visibleErrors = showErrors ? draftErrors : fieldErrors
  const quoteBlocked = Boolean(quoteInput) && (!quoteQuery.data || quoteQuery.isFetching || quoteQuery.isError)
  const policyBlocked = !isEdit && (policyQuery.isLoading || policyQuery.isError || !rules)
  const rangeBlocked = Boolean(checkIn && checkOut && checkOut > checkIn && (rangeQuery.isFetching || rangeQuery.isError))
  const submitDisabled = submitting || hasFieldErrors(draftErrors) || quoteBlocked || policyBlocked || rangeBlocked

  function guestFields() {
    return { firstName, lastName, phone, email }
  }

  function detachGuest() {
    if (!guestId) return
    setGuestId('')
    setGuestMode('new')
  }

  async function searchByPhone() {
    setPendingGuest(null)
    const parsed = normalizePhone(phone)
    if (!parsed.ok) {
      setFieldErrors((current) => ({ ...current, phone: parsed.error }))
      setSearchState('idle')
      return
    }
    setPhone(parsed.e164)
    detachGuest()
    setFieldErrors((current) => ({ ...current, phone: undefined }))
    setSearchState('loading')
    setSearchError(null)
    try {
      const page = await listAdminBookingGuests({ search: parsed.searchKey, page: 1, limit: 20 })
      const found = page.items
        .filter((item) => phonesMatch(item.phone, parsed.e164))
        .map((item) => ({
          id: item.id,
          firstName: item.firstName,
          lastName: item.lastName,
          phone: item.phone ?? '',
          email: item.email ?? '',
        }))
      setMatches(found)
      setSearchState('done')
    } catch (error) {
      setMatches([])
      setSearchState('error')
      setSearchError(errorMessage(error))
    }
  }

  function chooseGuest(guest: GuestCard, replace = false) {
    const proposal = proposeGuestFill(guestFields(), guest)
    if (proposal.conflicts.length > 0 && !replace) {
      setPendingGuest(guest)
      return
    }
    const next = replace ? applyGuestFill(guestFields(), guest, true) : proposal.fields
    const parsed = normalizePhone(next.phone)
    setFirstName(next.firstName)
    setLastName(next.lastName)
    setEmail(next.email)
    setPhone(parsed.ok ? parsed.e164 : next.phone)
    setGuestId(guest.id)
    setGuestMode('existing')
    setPendingGuest(null)
  }

  function onCalendarSelect(date: string) {
    if (!commercial) return
    const next = selectStayDate({
      currentCheckIn: checkIn,
      currentCheckOut: checkOut,
      clicked: date,
      nights: nightKinds,
      rules,
      now: clock,
    })
    setSelectionError(next.error)
    if (next.error) return
    setCheckIn(next.checkIn)
    setCheckOut(next.checkOut)
    setFormError(null)
  }

  async function freshStayAvailable() {
    const fresh = await getAdminCalendar({
      from: checkIn,
      to: checkOut,
      roomTypeId: selectedRoom?.roomTypeId,
      active: true,
    })
    return stayNightsAvailable(checkIn, checkOut, roomNightMap(fresh.roomTypes, roomId, ownBookingId))
  }

  async function applyReview() {
    if (!booking || !pendingPatch || submitting || !submitLock.current.tryBegin()) return
    setFormError(null)
    try {
      if (stayChanged) {
        const available = await freshStayAvailable()
        if (!available) {
          setFormError(bookingConflictMessage())
          return
        }
        await quoteAdminBooking({
          checkIn,
          checkOut,
          guestCount,
          rooms: [{ roomId, ratePlanId }],
          excludeBookingId: booking.id,
          ...(appliedPromo !== null ? { promoCode: appliedPromo } : promoCleared ? { promoCode: '' } : {}),
        })
      }
      await onSubmit(pendingPatch)
      setReviewOpen(false)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ROOM_UNAVAILABLE') setFormError(bookingConflictMessage())
      else setFormError(errorMessage(error))
    } finally {
      submitLock.current.end()
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !submitLock.current.tryBegin()) return
    setShowErrors(true)
    setFormError(null)
    if (hasFieldErrors(draftErrors)) {
      submitLock.current.end()
      return
    }

    const normalizedPhone = normalizePhone(phone)
    if (!booking && !normalizedPhone.ok) {
      setFormError(normalizedPhone.error)
      submitLock.current.end()
      return
    }
    let createStarted = false
    try {
      if (!booking) {
        onCreateActivity?.(true)
        createStarted = true
      }
      if (booking) {
        const result = buildAdminBookingUpdateInput({
          booking,
          role: user?.role,
          guestMode: guestMode === 'existing' ? 'existing' : 'keep',
          guestId,
          guest: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: normalizedPhone.ok ? normalizedPhone.e164 : phone.trim(),
            email: email.trim(),
          },
          checkIn,
          checkOut,
          adults,
          children,
          roomId,
          ratePlanId,
          notes,
          promoCodeId: promoTouched ? (quoteQuery.data?.promoCodeId ?? null) : undefined,
        })
        if ('error' in result) {
          setFormError(result.error)
          return
        }
        if (stayChanged || promoTouched) {
          const available = await freshStayAvailable()
          if (!available) {
            setFormError(bookingConflictMessage())
            return
          }
          await quoteAdminBooking({
            checkIn,
            checkOut,
            guestCount,
            rooms: [{ roomId, ratePlanId }],
            excludeBookingId: booking.id,
            ...(appliedPromo !== null ? { promoCode: appliedPromo } : promoCleared ? { promoCode: '' } : {}),
          })
        }
        setPendingPatch(result)
        setReviewOpen(true)
        return
      }

      if (!normalizedPhone.ok) {
        setFormError(normalizedPhone.error)
        return
      }
      const fresh = await getAdminCalendar({
        from: checkIn,
        to: checkOut,
        roomTypeId: selectedRoom?.roomTypeId,
        active: true,
      })
      const freshRoom = fresh.roomTypes.flatMap((type) => type.rooms).find((room) => room.roomId === roomId)
      const freshNights = new Map<string, NightAvailability>()
      for (const night of freshRoom?.nights ?? []) {
        freshNights.set(
          night.date,
          night.state === 'AVAILABLE' ? 'free' : night.state === 'BOOKED' || night.state === 'CHECKED_IN' ? 'occupied' : 'blocked',
        )
      }
      if (!freshRoom || !stayNightsAvailable(checkIn, checkOut, freshNights)) {
        setFormError(bookingConflictMessage())
        return
      }
      const quoted = await quoteAdminBooking({
        checkIn,
        checkOut,
        guestCount,
        rooms: [{ roomId, ratePlanId }],
        ...(appliedPromo !== null ? { promoCode: appliedPromo } : {}),
      })
      const result = buildAdminBookingCreateInput({
        guestMode: guestId ? 'existing' : 'new',
        guestId,
        guest: { firstName: firstName.trim(), lastName: lastName.trim(), phone: normalizedPhone.e164, email: email.trim() },
        checkIn,
        checkOut,
        adults,
        children,
        roomId,
        ratePlanId,
        notes: notes.trim(),
        promoCodeId: quoted.promoCodeId,
      })
      if ('error' in result) {
        setFormError(result.error)
        return
      }
      createStarted = false
      await onSubmit(result)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ROOM_UNAVAILABLE') setFormError(bookingConflictMessage())
      else setFormError(errorMessage(error))
    } finally {
      if (createStarted) onCreateActivity?.(false)
      submitLock.current.end()
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

  const accommodationName = selectedRoom ? bookingRoomFilterLabel(selectedRoom, roomType?.name) : ''

  return (
    <form
      className="mx-auto max-w-3xl space-y-8 overflow-x-hidden px-1 sm:px-0"
      aria-busy={submitting || undefined}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <fieldset disabled={submitting} className="space-y-8 disabled:opacity-80">
      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="font-serif text-2xl">Гість</h3>
        {profile ? (
          <>
            <Field label="Телефон" error={visibleErrors.phone}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={phone}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+380501112233"
                  onChange={(event) => {
                    setPhone(event.target.value)
                    detachGuest()
                    setSearchState('idle')
                  }}
                />
                <Button type="button" variant="outline" disabled={searchState === 'loading'} onClick={() => void searchByPhone()}>
                  {searchState === 'loading' ? 'Пошук…' : 'Знайти гостя'}
                </Button>
              </div>
            </Field>
            {searchState === 'error' && searchError ? <p className="text-sm text-destructive">{searchError}</p> : null}
            {searchState === 'done' && matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Гостя з цим телефоном немає. Можна створити нового в цьому бронюванні.</p>
            ) : null}
            {matches.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {matches.length === 1 ? 'Знайдено гостя. Оберіть, якщо це він.' : `Знайдено ${matches.length}. Оберіть потрібного гостя.`}
                </p>
                <ul className="divide-y divide-border border border-border">
                  {matches.map((guest) => (
                    <li key={guest.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">
                          {guest.lastName} {guest.firstName}
                        </p>
                        <p className="text-muted-foreground">
                          {guest.phone || '—'}
                          {guest.email ? ` · ${guest.email}` : ''}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant={guestId === guest.id ? 'default' : 'outline'} onClick={() => chooseGuest(guest)}>
                        {guestId === guest.id ? 'Обрано' : 'Обрати'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {pendingGuest ? (
              <div className="space-y-2 border border-border px-3 py-3 text-sm">
                <p>Деякі поля вже заповнені і відрізняються від картки гостя. Замінити їх?</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => chooseGuest(pendingGuest, true)}>
                    Замінити
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPendingGuest(null)}>
                    Залишити введене
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Імʼя" error={visibleErrors.firstName}>
                <Input
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value)
                    detachGuest()
                  }}
                />
              </Field>
              <Field label="Прізвище" error={visibleErrors.lastName}>
                <Input
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value)
                    detachGuest()
                  }}
                />
              </Field>
              <Field label="Email" error={visibleErrors.email} hint="Необовʼязково">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    detachGuest()
                  }}
                />
              </Field>
            </div>
            {guestId ? <p className="text-[11px] text-muted-foreground">Буде використано наявну картку гостя. Історію проживання тут не показано.</p> : null}
          </>
        ) : (
          <GuestReadOnly guest={booking!.guest} />
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="font-serif text-2xl">Проживання</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Номер / будиночок" error={visibleErrors.roomId}>
            <Select
              value={roomId || undefined}
              onValueChange={(value) => {
                setRoomId(value)
                if (!isEdit) {
                  setCheckIn('')
                  setCheckOut('')
                }
                setSelectionError(null)
              }}
              disabled={roomLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Оберіть розміщення" />
              </SelectTrigger>
              <SelectContent>
                {roomChoices.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {bookingRoomFilterLabel(room, roomTypes.find((type) => type.id === room.roomTypeId)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Тариф" error={visibleErrors.ratePlanId}>
            <Select value={ratePlanId || undefined} onValueChange={setRatePlanId} disabled={!commercial || (isEdit && !canReassign)}>
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
          <Field label="Дорослі" error={visibleErrors.guestCount}>
            <Input
              type="number"
              min={1}
              value={adults}
              disabled={!commercial}
              onChange={(event) => setAdults(Number(event.target.value))}
            />
          </Field>
          <Field label="Діти">
            <Input
              type="number"
              min={0}
              value={children}
              disabled={!commercial}
              onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}
            />
          </Field>
        </div>
        {maxGuests !== null ? (
          <p className="text-[11px] text-muted-foreground">Місткість цього розміщення — {maxGuests} гостей.</p>
        ) : null}
        {booking && commercial && currentRoom ? (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Зараз: {bookingRoomFilterLabel(
                rooms.find((room) => room.id === currentRoom.roomId) ?? { name: null, number: currentRoom.number, active: false },
                rooms.find((room) => room.id === currentRoom.roomId)
                  ? roomTypes.find((type) => type.id === currentRoom.roomTypeId)?.name
                  : currentRoom.roomTypeName,
              )} · {booking.checkIn} — {booking.checkOut}
            </p>
            <p>
              Пропозиція: {accommodationName || '—'} · {checkIn || '—'} — {checkOut || '—'}
            </p>
          </div>
        ) : null}
        {offerQuery.isError ? (
          <p className="text-sm text-destructive">Не вдалося перевірити доступність інших розміщень.</p>
        ) : null}
        {commercial ? (
          <StayCalendar
            month={calendarMonth}
            accommodationName={accommodationName}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nightKinds}
            today={hotelToday}
            allowSameDay={rules?.allowSameDayBooking ?? true}
            allowPastMonths={Boolean(booking)}
            loading={calendarQuery.isFetching}
            error={selectionError || (calendarQuery.isError ? 'Не вдалося завантажити доступність.' : null)}
            disabled={!roomId}
            onMonthChange={setCalendarMonth}
            onSelect={onCalendarSelect}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {checkIn && checkOut ? `${checkIn} — ${checkOut}` : 'Дати цього бронювання зафіксовано.'}
          </p>
        )}
        {visibleErrors.checkIn ? <p className="text-xs text-destructive">{visibleErrors.checkIn}</p> : null}
        {visibleErrors.checkOut ? <p className="text-xs text-destructive">{visibleErrors.checkOut}</p> : null}
      </section>

      {profile ? (
        <section className="space-y-4 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Примітки</h3>
          <Field label="Нотатки" error={visibleErrors.notes} hint="Необовʼязково">
            <Textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </section>
      ) : null}

      {commercial ? (
        <section className="space-y-2 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Послуги</h3>
          <p className="text-sm text-muted-foreground" role="status">
            {adminBookingServicesBlockedMessage()}
          </p>
        </section>
      ) : null}

      {commercial ? (
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-serif text-2xl">Вартість</h3>
          <Field
            label="Промокод"
            hint="Більша зі знижок перемагає: автоматична за 6 ночей або промокод. Суми не складаються. Якщо вони однакові, лишається промокод. Суму рахує сервер."
          >
            <div className="flex gap-2">
              <Input value={promoDraft} onChange={(event) => setPromoDraft(event.target.value)} placeholder="Код" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const code = promoDraft.trim()
                  if (!code) return
                  setAppliedPromo(code)
                  setPromoCleared(false)
                }}
              >
                Застосувати
              </Button>
            </div>
          </Field>
          {booking?.promoCodeId && !promoTouched ? (
            <p className="text-sm text-muted-foreground">Промокод уже збережено в цьому бронюванні.</p>
          ) : null}
          {appliedPromo ? <p className="text-sm">Застосовано код {appliedPromo}. Сума нижче — з сервера.</p> : null}
          {promoTouched ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAppliedPromo(null)
                setPromoDraft('')
                setPromoCleared(true)
              }}
            >
              Прибрати промокод
            </Button>
          ) : null}
          {quoteQuery.isFetching ? <p className="text-sm text-muted-foreground">Розрахунок…</p> : null}
          {quoteQuery.isError ? (
            <p className="text-sm text-destructive">
              {quoteQuery.error instanceof ApiError && quoteQuery.error.code === 'ROOM_UNAVAILABLE'
                ? bookingConflictMessage()
                : errorMessage(quoteQuery.error)}
            </p>
          ) : null}
          {booking && !stayChanged && !promoTouched ? (
            <p className="text-sm">
              Поточна сума {formatAdminBookingMoney(booking.price.totalAmount, booking.price.currency)} залишиться, доки не зміняться дати, розміщення або промокод.
            </p>
          ) : null}
          {quoteQuery.data ? (
            <PriceBreakdown
              currency={quoteQuery.data.price.currency}
              roomSubtotal={quoteQuery.data.price.roomSubtotal}
              servicesTotal={quoteQuery.data.price.servicesTotal}
              discountAmount={quoteQuery.data.price.discountAmount}
              taxAmount={quoteQuery.data.price.taxAmount}
              totalAmount={quoteQuery.data.price.totalAmount}
              previousTotal={booking && stayChanged ? booking.price.totalAmount : undefined}
              pricing={quoteQuery.data.pricing}
            />
          ) : !booking || stayChanged ? (
            <p className="text-sm text-muted-foreground">Оберіть розміщення, тариф і вільні дати для розрахунку.</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2 border-t border-border pt-5 text-sm">
        <h3 className="font-serif text-2xl">Підсумок</h3>
        <p>
          {firstName.trim() || '—'} {lastName.trim()} · {phone.trim() || 'без телефону'}
        </p>
        <p>{accommodationName || 'Розміщення не обрано'}</p>
        <p>
          {checkIn && checkOut
            ? `${checkIn} — ${checkOut} · ${nightsLabel(stayNightCount(checkIn, checkOut))} · ${guestCount} гостей`
            : 'Дати не обрані'}
        </p>
        {quoteQuery.data ? (
          <p className="font-medium">{formatAdminBookingMoney(quoteQuery.data.price.totalAmount, quoteQuery.data.price.currency)}</p>
        ) : null}
      </section>

      {policyQuery.isError ? <p className="text-sm text-destructive">Не вдалося завантажити правила бронювання готелю.</p> : null}
      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="submit" disabled={submitDisabled} loading={submitting} className="w-full sm:w-auto">
          {submitting ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Створити бронювання'}
        </Button>
        {submitting ? (
          <Button type="button" variant="outline" disabled className="w-full sm:w-auto">
            Скасувати
          </Button>
        ) : (
          <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
            <Link to={booking ? `/admin/bookings/${booking.id}` : '/admin/bookings'}>Скасувати</Link>
          </Button>
        )}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Застосувати зміни?</DialogTitle>
          </DialogHeader>
          {booking ? (
            <div className="space-y-2 text-sm">
              <p>
                Дати: {booking.checkIn} — {booking.checkOut}
                {checkIn !== booking.checkIn || checkOut !== booking.checkOut ? ` → ${checkIn} — ${checkOut}` : ' без змін'}
              </p>
              <p>
                Розміщення: {currentRoom ? bookingRoomFilterLabel(
                  rooms.find((room) => room.id === currentRoom.roomId) ?? { name: null, number: currentRoom.number, active: false },
                  rooms.find((room) => room.id === currentRoom.roomId)
                    ? roomTypes.find((type) => type.id === currentRoom.roomTypeId)?.name
                    : currentRoom.roomTypeName,
                ) : '—'}
                {currentRoom && roomId !== currentRoom.roomId ? ` → ${accommodationName || '—'}` : ' без змін'}
              </p>
              <p>Гості: {booking.guestCount}{guestCount !== booking.guestCount ? ` → ${guestCount}` : ' без змін'}</p>
              {stayChanged && quoteQuery.data ? (
                <PriceChange previous={booking.price.totalAmount} next={quoteQuery.data.price.totalAmount} currency={quoteQuery.data.price.currency} />
              ) : (
                <p>Сума {formatAdminBookingMoney(booking.price.totalAmount, booking.price.currency)} не зміниться.</p>
              )}
              {stayChanged ? (
                <p className="text-muted-foreground">
                  Попереднє розміщення звільниться лише якщо нове призначення збережеться. Окремої ручної ціни в системі немає: сума стане результатом серверного розрахунку.
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setReviewOpen(false)}>
              Повернутися
            </Button>
            <Button type="button" disabled={submitting} loading={submitting} onClick={() => void applyReview()}>
              {submitting ? 'Збереження…' : 'Застосувати'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </fieldset>
    </form>
  )
}

function PriceChange({ previous, next, currency }: { previous: string; next: string; currency: string }) {
  const difference = stayPriceDifference(previous, next)
  return (
    <div className="space-y-1">
      <p>Було: {formatAdminBookingMoney(previous, currency)}</p>
      <p>Стане: {formatAdminBookingMoney(next, currency)}</p>
      <p>
        {difference ? (difference.same ? 'Різниця: 0,00 ₴' : `Різниця: ${signedMoney(difference.delta, difference.increased, currency)}`) : 'Різницю не вдалося порівняти.'}
      </p>
    </div>
  )
}

function GuestReadOnly({ guest }: { guest: AdminBookingGuest }) {
  return (
    <div className="text-sm">
      <p>
        {guest.lastName} {guest.firstName}
      </p>
      <p className="text-muted-foreground">{guest.phone || '—'}</p>
      <p className="text-muted-foreground">{guest.email || '—'}</p>
    </div>
  )
}

function PriceBreakdown({
  currency,
  roomSubtotal,
  servicesTotal,
  discountAmount,
  taxAmount,
  totalAmount,
  previousTotal,
  pricing,
}: {
  currency: string
  roomSubtotal: string
  servicesTotal: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  previousTotal?: string
  pricing?: {
    automaticDiscount: string
    promoDiscount: string
    appliedSource: 'NONE' | 'AUTOMATIC' | 'PROMO'
  }
}) {
  const difference = previousTotal ? stayPriceDifference(previousTotal, totalAmount) : null
  return (
    <div>
      {previousTotal ? <p className="text-sm text-muted-foreground">Було {formatAdminBookingMoney(previousTotal, currency)}</p> : null}
      <p className="font-serif text-3xl">{formatAdminBookingMoney(totalAmount, currency)}</p>
      {difference ? (
        <p className="mt-1 text-sm">
          {difference.same ? 'Сума не зміниться.' : `Різниця ${signedMoney(difference.delta, difference.increased, currency)}.`}
        </p>
      ) : null}
      <dl className="mt-3 max-w-sm space-y-1 text-sm">
        <Row label="Проживання" value={formatAdminBookingMoney(roomSubtotal, currency)} />
        <Row label="Послуги" value={formatAdminBookingMoney(servicesTotal, currency)} />
        {pricing?.appliedSource === 'AUTOMATIC' ? (
          <Row label="Знижка за тривалість" value={formatAdminBookingMoney(pricing.automaticDiscount, currency)} />
        ) : pricing?.appliedSource === 'PROMO' ? (
          <Row label="Промокод" value={formatAdminBookingMoney(pricing.promoDiscount, currency)} />
        ) : (
          <Row label="Знижка" value={formatAdminBookingMoney(discountAmount, currency)} />
        )}
        <Row label="Податок" value={formatAdminBookingMoney(taxAmount, currency)} />
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">Сума перевіряється сервером ще раз під час збереження.</p>
    </div>
  )
}

function signedMoney(delta: string, increased: boolean, currency: string) {
  const amount = formatAdminBookingMoney(delta.replace(/^-/, ''), currency)
  if (delta === '0.00') return amount
  return `${increased ? '+' : '−'}${amount}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
