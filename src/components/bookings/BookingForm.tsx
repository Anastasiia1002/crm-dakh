import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { addDaysIso } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { bookingSourceLabel, paymentMethodLabel, paymentStatusLabel, serviceUnitLabel } from '@/lib/labels'
import { quoteStay } from '@/lib/pricing'
import type {
  Accommodation,
  Booking,
  BookingSource,
  BookingWriteInput,
  Guest,
  PaymentMethod,
  PaymentStatus,
  PricePeriod,
  PromoCode,
  RatePlan,
  RoomType,
  Service,
} from '@/types'

const schema = z
  .object({
    guestMode: z.enum(['existing', 'new']),
    guestId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    email: z.string(),
    accommodationId: z.string().min(1, 'Оберіть номер або будиночок'),
    ratePlanId: z.string().min(1, 'Оберіть тариф'),
    checkIn: z.string().min(1, 'Вкажіть дату заїзду'),
    checkOut: z.string().min(1, 'Вкажіть дату виїзду'),
    checkInTime: z.string().min(1, 'Вкажіть час заїзду'),
    adults: z.number({ invalid_type_error: 'Вкажіть кількість' }).int().min(1, 'Потрібен хоча б один дорослий'),
    children: z.number({ invalid_type_error: 'Вкажіть кількість' }).int().min(0),
    status: z.enum(['PENDING', 'CONFIRMED']),
    source: z.enum(['website', 'phone', 'walk_in', 'admin', 'partner']),
    serviceIds: z.array(z.string()),
    promoCode: z.string(),
    notes: z.string(),
    paymentStatus: z.enum(['unpaid', 'deposit', 'paid', 'refunded']),
    paymentMethod: z.enum(['', 'cash', 'terminal', 'invoice']),
  })
  .superRefine((value, ctx) => {
    if (value.checkIn && value.checkOut && value.checkOut <= value.checkIn) {
      ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Виїзд має бути пізніше заїзду' })
    }
    if (value.guestMode === 'existing' && !value.guestId) {
      ctx.addIssue({ code: 'custom', path: ['guestId'], message: 'Оберіть гостя' })
    }
    if (value.guestMode === 'new') {
      if (!value.firstName.trim()) ctx.addIssue({ code: 'custom', path: ['firstName'], message: 'Вкажіть імʼя' })
      if (!value.lastName.trim()) ctx.addIssue({ code: 'custom', path: ['lastName'], message: 'Вкажіть прізвище' })
      if (value.phone.trim().length < 10) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Вкажіть телефон' })
      if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Вкажіть коректну електронну пошту' })
      }
    }
    if (value.paymentStatus !== 'unpaid' && !value.paymentMethod) {
      ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'Оберіть спосіб оплати' })
    }
  })

type FormValues = z.infer<typeof schema>

const sources = Object.entries(bookingSourceLabel) as [BookingSource, string][]
const paymentStatuses = Object.entries(paymentStatusLabel) as [PaymentStatus, string][]
const methods = (['cash', 'terminal', 'invoice'] as PaymentMethod[]).map(
  (method) => [method, paymentMethodLabel[method]] as const,
)

export function BookingForm({
  booking,
  guests,
  accommodations,
  roomTypes,
  ratePlans,
  periods,
  services,
  promos,
  defaultCheckInTime,
  preset,
  submitting,
  onSubmit,
}: {
  booking?: Booking
  guests: Guest[]
  accommodations: Accommodation[]
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
  periods: PricePeriod[]
  services: Service[]
  promos: PromoCode[]
  defaultCheckInTime: string
  preset?: { accommodationId?: string; checkIn?: string; checkOut?: string }
  submitting: boolean
  onSubmit: (input: BookingWriteInput) => void
}) {
  const locked = booking?.status === 'CHECKED_IN'
  const initialPromo = promos.find((item) => item.id === booking?.promoCodeId)?.code ?? ''
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guestMode: 'existing',
      guestId: booking?.guestId ?? '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      accommodationId: booking?.accommodationId ?? preset?.accommodationId ?? '',
      ratePlanId: booking?.ratePlanId ?? ratePlans.find((item) => item.active)?.id ?? '',
      checkIn: booking?.checkIn ?? preset?.checkIn ?? '',
      checkOut: booking?.checkOut ?? preset?.checkOut ?? (preset?.checkIn ? addDaysIso(preset.checkIn, 1) : ''),
      checkInTime: booking?.checkInTime ?? defaultCheckInTime,
      adults: booking?.adults ?? 2,
      children: booking?.children ?? 0,
      status: booking?.status === 'PENDING' ? 'PENDING' : 'CONFIRMED',
      source: booking?.source ?? 'admin',
      serviceIds: booking?.serviceIds ?? [],
      promoCode: initialPromo,
      notes: booking?.notes ?? '',
      paymentStatus: booking?.paymentStatus ?? 'unpaid',
      paymentMethod:
        booking?.paymentMethod && booking.paymentMethod !== 'online' ? booking.paymentMethod : '',
    },
  })

  const values = form.watch()
  const accommodation = accommodations.find((item) => item.id === values.accommodationId)
  const roomType = roomTypes.find((item) => item.id === accommodation?.roomTypeId)
  const promo = useMemo(() => {
    const code = values.promoCode.trim().toLowerCase()
    if (!code) return null
    return (
      promos.find(
        (item) =>
          item.active &&
          item.code.toLowerCase() === code &&
          values.checkIn >= item.validFrom &&
          values.checkIn <= item.validTo,
      ) ?? null
    )
  }, [promos, values.checkIn, values.promoCode])

  const quote = useMemo(() => {
    if (!roomType || !values.ratePlanId || !values.checkIn || !values.checkOut || values.checkOut <= values.checkIn) {
      return null
    }
    return quoteStay({
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      ratePlanId: values.ratePlanId,
      roomTypeId: roomType.id,
      basePrice: roomType.basePrice,
      periods,
      services,
      serviceIds: values.serviceIds,
      adults: Number.isFinite(values.adults) ? values.adults : 0,
      children: Number.isFinite(values.children) ? values.children : 0,
      promo,
    })
  }, [periods, promo, roomType, services, values])

  const people = (Number.isFinite(values.adults) ? values.adults : 0) + (Number.isFinite(values.children) ? values.children : 0)
  const overCapacity = roomType ? people > roomType.capacity : false

  return (
    <form
      className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_280px]"
      onSubmit={form.handleSubmit((data) => {
        onSubmit({
          guestId: data.guestMode === 'existing' ? data.guestId : undefined,
          newGuest:
            data.guestMode === 'new'
              ? {
                  firstName: data.firstName,
                  lastName: data.lastName,
                  phone: data.phone,
                  email: data.email,
                }
              : undefined,
          accommodationId: data.accommodationId,
          ratePlanId: data.ratePlanId,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          checkInTime: data.checkInTime,
          adults: data.adults,
          children: data.children,
          status: data.status,
          source: data.source,
          serviceIds: data.serviceIds,
          promoCode: data.promoCode.trim() || null,
          notes: data.notes,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentStatus === 'unpaid' ? null : data.paymentMethod || null,
        })
      })}
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-medium">Гість</h2>
          <div className="flex gap-2">
            {(['existing', 'new'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  values.guestMode === mode ? 'border-foreground bg-primary text-primary-foreground' : 'border-border bg-surface'
                }`}
                onClick={() => form.setValue('guestMode', mode)}
              >
                {mode === 'existing' ? 'Існуючий гість' : 'Новий гість'}
              </button>
            ))}
          </div>
          {values.guestMode === 'existing' ? (
            <Field label="Гість" error={form.formState.errors.guestId?.message}>
              <Controller
                control={form.control}
                name="guestId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть гостя" />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.map((guest) => (
                        <SelectItem key={guest.id} value={guest.id}>
                          {guest.lastName} {guest.firstName} · {guest.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Імʼя" error={form.formState.errors.firstName?.message}>
                <Input {...form.register('firstName')} />
              </Field>
              <Field label="Прізвище" error={form.formState.errors.lastName?.message}>
                <Input {...form.register('lastName')} />
              </Field>
              <Field label="Телефон" error={form.formState.errors.phone?.message}>
                <Input {...form.register('phone')} placeholder="+380" />
              </Field>
              <Field label="Електронна пошта" error={form.formState.errors.email?.message}>
                <Input {...form.register('email')} />
              </Field>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-medium">Проживання</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Номер / будиночок" error={form.formState.errors.accommodationId?.message}>
              <Controller
                control={form.control}
                name="accommodationId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть" />
                    </SelectTrigger>
                    <SelectContent>
                      {accommodations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Тариф" error={form.formState.errors.ratePlanId?.message}>
              <Controller
                control={form.control}
                name="ratePlanId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть тариф" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratePlans
                        .filter((item) => item.active)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Заїзд" error={form.formState.errors.checkIn?.message}>
              <Input type="date" {...form.register('checkIn')} />
            </Field>
            <Field label="Виїзд" error={form.formState.errors.checkOut?.message}>
              <Input type="date" {...form.register('checkOut')} />
            </Field>
            <Field label="Час заїзду" error={form.formState.errors.checkInTime?.message}>
              <Input type="time" {...form.register('checkInTime')} />
            </Field>
            <Field label="Джерело">
              <Controller
                control={form.control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Дорослі" error={form.formState.errors.adults?.message}>
              <Input type="number" min={1} {...form.register('adults', { valueAsNumber: true })} />
            </Field>
            <Field label="Діти" error={form.formState.errors.children?.message}>
              <Input type="number" min={0} {...form.register('children', { valueAsNumber: true })} />
            </Field>
            {!locked ? (
              <Field label="Статус">
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFIRMED">Підтверджено</SelectItem>
                        <SelectItem value="PENDING">Очікує підтвердження</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : (
              <Field label="Статус" hint="Гість уже заселений. Статус змінюється окремою дією.">
                <Input value="Заселено" readOnly />
              </Field>
            )}
          </div>
          {overCapacity ? (
            <p className="text-sm text-destructive">
              Кількість гостей перевищує місткість категорії ({roomType?.capacity}).
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-medium">Послуги</h2>
          <ul className="divide-y divide-border border-y border-border">
            {services.filter((service) => service.active).map((service) => {
              const checked = values.serviceIds.includes(service.id)
              return (
                <li key={service.id} className="flex items-center justify-between gap-4 py-3">
                  <label className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const ids = next
                          ? [...values.serviceIds, service.id]
                          : values.serviceIds.filter((id) => id !== service.id)
                        form.setValue('serviceIds', ids, { shouldDirty: true })
                      }}
                    />
                    <span>
                      <span className="block">{service.name}</span>
                      <span className="text-xs text-muted-foreground">{serviceUnitLabel[service.unit]}</span>
                    </span>
                  </label>
                  <span className="text-sm tabular-nums">{formatMoney(service.price)}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Промокод"
            hint={values.promoCode.trim() && !promo ? 'Промокод не застосовано' : undefined}
          >
            <Input {...form.register('promoCode')} placeholder="Наприклад, ОСІНЬ" />
          </Field>
          <Field label="Статус оплати" error={form.formState.errors.paymentMethod?.message}>
            <Controller
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatuses.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Спосіб оплати" hint="Онлайн-оплата буде доступна після підключення.">
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не вказано</SelectItem>
                    {methods.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                    <SelectItem value="online" disabled>
                      Онлайн — незабаром
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Примітки">
              <Textarea {...form.register('notes')} />
            </Field>
          </div>
        </section>
      </div>

      <aside className="border border-border bg-surface p-5 xl:sticky xl:top-24">
        <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Разом</p>
        <p className="mt-2 font-serif text-4xl leading-none">{quote ? formatMoney(quote.totalAmount) : '—'}</p>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Ночей</dt>
            <dd>{quote?.nights ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Проживання</dt>
            <dd>{quote ? formatMoney(quote.accommodationAmount) : '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Послуги</dt>
            <dd>{quote ? formatMoney(quote.servicesAmount) : '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Знижка</dt>
            <dd>{quote ? formatMoney(quote.discountAmount) : '—'}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-2">
          <Button type="submit" disabled={submitting || overCapacity}>
            Зберегти
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={booking ? `/admin/bookings/${booking.id}` : '/admin/bookings'}>Скасувати</Link>
          </Button>
        </div>
      </aside>
    </form>
  )
}
