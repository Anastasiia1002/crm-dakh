import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LoadingState, SectionHeading } from '@/components/ui/states'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useDeletePolicy,
  useHotelBookingSettings,
  useHotelSettings,
  usePolicies,
  useSavePolicy,
  useUpdateHotelBookingSettings,
  useUpdateHotelSettings,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import type { CancellationPolicy, HotelBookingSettings, HotelBookingSettingsUpdate, HotelSettings, HotelSettingsUpdate } from '@/types'

const timeField = z
  .string()
  .refine((value) => value.trim() === '' || /^([01]\d|2[0-3]):[0-5]\d/.test(value.trim()), 'Час має бути у форматі ГГ:хх')

const optionalInt = (min: number, message: string) =>
  z.string().refine((value) => {
    const trimmed = value.trim()
    if (!trimmed) return true
    return /^\d+$/.test(trimmed) && Number(trimmed) >= min
  }, message)

const hotelSchema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Назва задовга'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Вкажіть slug')
    .max(80, 'Slug задовгий')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Лише малі латинські літери, цифри та дефіси'),
  description: z.string().max(4000, 'Опис задовгий'),
  email: z
    .string()
    .max(320, 'Електронна пошта задовга')
    .refine((value) => value.trim() === '' || z.string().email().safeParse(value.trim()).success, 'Вкажіть коректну електронну пошту'),
  phone: z.string().max(40, 'Телефон задовгий'),
  address: z.string().max(300, 'Адреса задовга'),
  city: z.string().max(120, 'Місто задовге'),
  country: z.string().max(120, 'Країна задовга'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Код валюти з 3 літер'),
  timezone: z.string().trim().min(1, 'Вкажіть часовий пояс').max(100, 'Часовий пояс задовгий'),
  checkInTime: timeField,
  checkOutTime: timeField,
})

const bookingSchema = z
  .object({
    minAdvanceHours: z.number({ invalid_type_error: 'Вкажіть число' }).int().min(0, 'Має бути не менше 0'),
    maxAdvanceDays: optionalInt(1, 'Має бути цілим числом від 1 або порожнім'),
    defaultMinStay: z.number({ invalid_type_error: 'Вкажіть число' }).int().min(1, 'Має бути не менше 1'),
    defaultMaxStay: optionalInt(1, 'Має бути цілим числом від 1 або порожнім'),
    allowSameDayBooking: z.boolean(),
    allowCancellation: z.boolean(),
    cancellationHours: optionalInt(0, 'Має бути цілим числом від 0 або порожнім'),
  })
  .superRefine((value, ctx) => {
    const maxStay = blankToNull(value.defaultMaxStay)
    if (maxStay !== null && maxStay < value.defaultMinStay) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultMaxStay'],
        message: 'Максимум ночей не може бути меншим за мінімум',
      })
    }
  })

type HotelFormValues = z.infer<typeof hotelSchema>
type BookingFormValues = z.infer<typeof bookingSchema>

export function SettingsPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'owner' || user?.role === 'admin'
  const hotel = useHotelSettings()
  const booking = useHotelBookingSettings()
  const policies = usePolicies()
  const remove = useDeletePolicy()
  const [editing, setEditing] = useState<CancellationPolicy | 'new' | null>(null)
  const waiting = !hotel.data && !booking.data && (hotel.isLoading || booking.isLoading)

  return (
    <div className="max-w-3xl space-y-14">
      {waiting ? <LoadingState /> : null}
      {hotel.isError ? <LoadError onRetry={() => void hotel.refetch()} /> : null}
      {hotel.data ? <HotelForm hotel={hotel.data} canEdit={canEdit} /> : null}
      {!waiting && booking.isLoading && !booking.data ? <LoadingState /> : null}
      {booking.isError ? <LoadError onRetry={() => void booking.refetch()} /> : null}
      {booking.data ? <BookingSettingsForm settings={booking.data} canEdit={canEdit} /> : null}

      <section>
        <SectionHeading
          title="Правила скасування"
          action={
            canEdit && policies.data ? <Button onClick={() => setEditing('new')}>Додати правило</Button> : undefined
          }
        />
        {policies.isLoading && !policies.data ? <LoadingState /> : null}
        {policies.isError ? <LoadError onRetry={() => void policies.refetch()} /> : null}
        <div className="divide-y divide-border border-y border-border">
          {policies.data?.map((policy) => (
            <article key={policy.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
              <div>
                <h3 className="text-base">{policy.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{policy.description}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {policy.rules.map((rule) => (
                    <li key={`${policy.id}-${rule.daysBefore}`}>
                      За {rule.daysBefore} дн. — повернення {rule.refundPercent}%
                    </li>
                  ))}
                </ul>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(policy)}>
                    Редагувати
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await remove.mutateAsync(policy.id)
                        toast.success('Правило видалено')
                      } catch (error) {
                        toast.error(errorMessage(error))
                      }
                    }}
                  >
                    Видалити
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-8">
        <h2 className="font-serif text-[1.7rem] font-medium">Оплата</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Онлайн-оплата ще не підключена. У бронюваннях уже є статус і спосіб оплати, тож платіжного провайдера можна
          буде додати без зміни карток бронювання.
        </p>
        <dl className="mt-5 max-w-md text-sm">
          <div className="flex justify-between border-b border-border py-3">
            <dt className="text-muted-foreground">Валюта</dt>
            <dd>{hotel.data?.currency ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-3">
            <dt className="text-muted-foreground">Онлайн-оплата</dt>
            <dd>Не підключено</dd>
          </div>
        </dl>
      </section>

      <PolicyDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function HotelForm({ hotel, canEdit }: { hotel: HotelSettings; canEdit: boolean }) {
  const update = useUpdateHotelSettings()
  const form = useForm<HotelFormValues>({
    resolver: zodResolver(hotelSchema),
    values: {
      name: hotel.name,
      slug: hotel.slug,
      description: hotel.description ?? '',
      email: hotel.email ?? '',
      phone: hotel.phone ?? '',
      address: hotel.address ?? '',
      city: hotel.city ?? '',
      country: hotel.country ?? '',
      currency: hotel.currency,
      timezone: hotel.timezone,
      checkInTime: hotel.checkInTime ?? '',
      checkOutTime: hotel.checkOutTime ?? '',
    },
  })

  return (
    <section>
      <SectionHeading title="Готель" />
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          if (!canEdit) return
          const patch = hotelPatch(hotel, values)
          if (!patch) {
            toast.success('Налаштування збережено')
            return
          }
          try {
            await update.mutateAsync(patch)
            toast.success('Налаштування збережено')
          } catch (error) {
            notifySettingsError(error, (field, message) => {
              if (field in values) form.setError(field as Path<HotelFormValues>, { message })
            })
          }
        })}
      >
        <Field label="Назва" error={form.formState.errors.name?.message}>
          <Input disabled={!canEdit} {...form.register('name')} />
        </Field>
        <Field label="Slug" error={form.formState.errors.slug?.message}>
          <Input disabled={!canEdit} {...form.register('slug')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Опис" error={form.formState.errors.description?.message}>
            <Textarea disabled={!canEdit} {...form.register('description')} />
          </Field>
        </div>
        <Field label="Електронна пошта" error={form.formState.errors.email?.message}>
          <Input type="email" disabled={!canEdit} {...form.register('email')} />
        </Field>
        <Field label="Телефон" error={form.formState.errors.phone?.message}>
          <Input disabled={!canEdit} {...form.register('phone')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Адреса" error={form.formState.errors.address?.message}>
            <Input disabled={!canEdit} {...form.register('address')} />
          </Field>
        </div>
        <Field label="Місто" error={form.formState.errors.city?.message}>
          <Input disabled={!canEdit} {...form.register('city')} />
        </Field>
        <Field label="Країна" error={form.formState.errors.country?.message}>
          <Input disabled={!canEdit} {...form.register('country')} />
        </Field>
        <Field label="Валюта" error={form.formState.errors.currency?.message}>
          <Input disabled={!canEdit} maxLength={3} {...form.register('currency')} />
        </Field>
        <Field label="Часовий пояс" error={form.formState.errors.timezone?.message}>
          <Input disabled={!canEdit} {...form.register('timezone')} />
        </Field>
        <Field label="Час заїзду" error={form.formState.errors.checkInTime?.message}>
          <Input type="time" disabled={!canEdit} {...form.register('checkInTime')} />
        </Field>
        <Field label="Час виїзду" error={form.formState.errors.checkOutTime?.message}>
          <Input type="time" disabled={!canEdit} {...form.register('checkOutTime')} />
        </Field>
        {canEdit ? (
          <div className="sm:col-span-2">
            <Button type="submit" disabled={update.isPending}>
              Зберегти
            </Button>
          </div>
        ) : null}
      </form>
    </section>
  )
}

function BookingSettingsForm({ settings, canEdit }: { settings: HotelBookingSettings; canEdit: boolean }) {
  const update = useUpdateHotelBookingSettings()
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    values: {
      minAdvanceHours: settings.minAdvanceHours,
      maxAdvanceDays: settings.maxAdvanceDays === null ? '' : String(settings.maxAdvanceDays),
      defaultMinStay: settings.defaultMinStay,
      defaultMaxStay: settings.defaultMaxStay === null ? '' : String(settings.defaultMaxStay),
      allowSameDayBooking: settings.allowSameDayBooking,
      allowCancellation: settings.allowCancellation,
      cancellationHours: settings.cancellationHours === null ? '' : String(settings.cancellationHours),
    },
  })

  return (
    <section>
      <SectionHeading title="Параметри бронювання" />
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          if (!canEdit) return
          const patch = bookingPatch(settings, values)
          if (!patch) {
            toast.success('Налаштування збережено')
            return
          }
          try {
            await update.mutateAsync(patch)
            toast.success('Налаштування збережено')
          } catch (error) {
            notifySettingsError(error, (field, message) => {
              if (field in values) form.setError(field as Path<BookingFormValues>, { message })
            })
          }
        })}
      >
        <Field label="Мінімум годин до заїзду" error={form.formState.errors.minAdvanceHours?.message}>
          <Input type="number" min={0} disabled={!canEdit} {...form.register('minAdvanceHours', { valueAsNumber: true })} />
        </Field>
        <Field label="Максимум днів наперед" hint="Порожнє — без обмеження" error={form.formState.errors.maxAdvanceDays?.message}>
          <Input type="number" min={1} disabled={!canEdit} {...form.register('maxAdvanceDays')} />
        </Field>
        <Field label="Мінімум ночей" error={form.formState.errors.defaultMinStay?.message}>
          <Input type="number" min={1} disabled={!canEdit} {...form.register('defaultMinStay', { valueAsNumber: true })} />
        </Field>
        <Field label="Максимум ночей" hint="Порожнє — без обмеження" error={form.formState.errors.defaultMaxStay?.message}>
          <Input type="number" min={1} disabled={!canEdit} {...form.register('defaultMaxStay')} />
        </Field>
        <CheckboxField form={form} name="allowSameDayBooking" label="Бронювання в день заїзду" disabled={!canEdit} />
        <CheckboxField form={form} name="allowCancellation" label="Скасування дозволено" disabled={!canEdit} />
        <Field label="Годин на скасування" hint="Порожнє — без обмеження" error={form.formState.errors.cancellationHours?.message}>
          <Input type="number" min={0} disabled={!canEdit} {...form.register('cancellationHours')} />
        </Field>
        {canEdit ? (
          <div className="sm:col-span-2">
            <Button type="submit" disabled={update.isPending}>
              Зберегти
            </Button>
          </div>
        ) : null}
      </form>
    </section>
  )
}

function CheckboxField<T extends FieldValues>({
  form,
  name,
  label,
  disabled,
}: {
  form: UseFormReturn<T>
  name: Path<T>
  label: string
  disabled: boolean
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-3 pt-7 text-sm">
          <Checkbox checked={field.value === true} disabled={disabled} onCheckedChange={(value) => field.onChange(value === true)} />
          {label}
        </label>
      )}
    />
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-3 border-t border-border py-10">
      <p className="text-sm">Не вдалося завантажити дані</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Спробувати ще раз
      </Button>
    </div>
  )
}

function hotelPatch(current: HotelSettings, values: HotelFormValues): HotelSettingsUpdate | null {
  const patch: HotelSettingsUpdate = {}
  const name = values.name.trim()
  const slug = values.slug.trim().toLowerCase()
  const currency = values.currency.trim().toUpperCase()
  const timezone = values.timezone.trim()
  if (name !== current.name) patch.name = name
  if (slug !== current.slug) patch.slug = slug
  assignText(patch, 'description', current.description, values.description)
  assignText(patch, 'email', current.email, values.email.trim().toLowerCase())
  assignText(patch, 'phone', current.phone, values.phone)
  assignText(patch, 'address', current.address, values.address)
  assignText(patch, 'city', current.city, values.city)
  assignText(patch, 'country', current.country, values.country)
  if (currency !== current.currency) patch.currency = currency
  if (timezone !== current.timezone) patch.timezone = timezone
  assignTime(patch, 'checkInTime', current.checkInTime, values.checkInTime)
  assignTime(patch, 'checkOutTime', current.checkOutTime, values.checkOutTime)
  return Object.keys(patch).length > 0 ? patch : null
}

function bookingPatch(current: HotelBookingSettings, values: BookingFormValues): HotelBookingSettingsUpdate | null {
  const patch: HotelBookingSettingsUpdate = {}
  const maxAdvanceDays = blankToNull(values.maxAdvanceDays)
  const defaultMaxStay = blankToNull(values.defaultMaxStay)
  const cancellationHours = blankToNull(values.cancellationHours)
  if (values.minAdvanceHours !== current.minAdvanceHours) patch.minAdvanceHours = values.minAdvanceHours
  if (maxAdvanceDays !== current.maxAdvanceDays) patch.maxAdvanceDays = maxAdvanceDays
  if (values.defaultMinStay !== current.defaultMinStay) patch.defaultMinStay = values.defaultMinStay
  if (defaultMaxStay !== current.defaultMaxStay) patch.defaultMaxStay = defaultMaxStay
  if (values.allowSameDayBooking !== current.allowSameDayBooking) patch.allowSameDayBooking = values.allowSameDayBooking
  if (values.allowCancellation !== current.allowCancellation) patch.allowCancellation = values.allowCancellation
  if (cancellationHours !== current.cancellationHours) patch.cancellationHours = cancellationHours
  return Object.keys(patch).length > 0 ? patch : null
}

function assignText(
  patch: HotelSettingsUpdate,
  field: 'description' | 'email' | 'phone' | 'address' | 'city' | 'country',
  current: string | null,
  value: string,
) {
  const next = value.trim() ? value.trim() : null
  if (next !== current) patch[field] = next
}

function assignTime(patch: HotelSettingsUpdate, field: 'checkInTime' | 'checkOutTime', current: string | null, value: string) {
  const next = clockOrNull(value)
  if (next !== current) patch[field] = next
}

function clockOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(trimmed)
  return match ? `${match[1]}:${match[2]}` : trimmed
}

function blankToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : null
}

function notifySettingsError(error: unknown, setField: (field: string, message: string) => void) {
  if (!(error instanceof ApiError)) {
    toast.error(errorMessage(error))
    return
  }
  if (error.status === 403) {
    toast.error('Недостатньо прав для зміни налаштувань')
    return
  }
  if (error.status === 404) {
    toast.error(error.message || 'Готель не знайдено')
    return
  }
  if (error.status === 409) {
    const message = error.code === 'SLUG_ALREADY_EXISTS' ? 'Готель з таким slug вже існує' : error.message
    setField('slug', message)
    toast.error(message)
    return
  }
  if (error.details?.length) {
    for (const detail of error.details) {
      const separator = detail.indexOf(':')
      if (separator > 0) setField(detail.slice(0, separator).trim(), detail.slice(separator + 1).trim() || detail)
    }
    toast.error(error.details.join('. '))
    return
  }
  toast.error(error.message)
}

const policySchema = z.object({
  name: z.string().min(1, 'Вкажіть назву'),
  description: z.string(),
  daysBefore: z.number({ invalid_type_error: 'Вкажіть дні' }).int().min(0),
  refundPercent: z.number({ invalid_type_error: 'Вкажіть відсоток' }).int().min(0).max(100),
  daysBeforeLate: z.number({ invalid_type_error: 'Вкажіть дні' }).int().min(0),
  refundPercentLate: z.number({ invalid_type_error: 'Вкажіть відсоток' }).int().min(0).max(100),
})

function PolicyDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item?: CancellationPolicy
  onOpenChange: (open: boolean) => void
}) {
  const save = useSavePolicy()
  const primary = item?.rules[0]
  const secondary = item?.rules[1] ?? item?.rules[0]
  const form = useForm<z.infer<typeof policySchema>>({
    resolver: zodResolver(policySchema),
    values: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      daysBefore: primary?.daysBefore ?? 7,
      refundPercent: primary?.refundPercent ?? 100,
      daysBeforeLate: secondary?.daysBefore ?? 0,
      refundPercentLate: secondary?.refundPercent ?? 0,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати правило' : 'Нове правило'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                name: values.name,
                description: values.description,
                rules: [
                  { daysBefore: values.daysBefore, refundPercent: values.refundPercent },
                  { daysBefore: values.daysBeforeLate, refundPercent: values.refundPercentLate },
                ],
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Опис">
            <Textarea {...form.register('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Днів до заїзду" error={form.formState.errors.daysBefore?.message}>
              <Input type="number" {...form.register('daysBefore', { valueAsNumber: true })} />
            </Field>
            <Field label="Повернення, %" error={form.formState.errors.refundPercent?.message}>
              <Input type="number" {...form.register('refundPercent', { valueAsNumber: true })} />
            </Field>
            <Field label="Пізніше, днів" error={form.formState.errors.daysBeforeLate?.message}>
              <Input type="number" {...form.register('daysBeforeLate', { valueAsNumber: true })} />
            </Field>
            <Field label="Повернення, %" error={form.formState.errors.refundPercentLate?.message}>
              <Input type="number" {...form.register('refundPercentLate', { valueAsNumber: true })} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
