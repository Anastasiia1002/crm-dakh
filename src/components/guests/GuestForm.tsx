import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Guest, GuestWriteInput } from '@/types'

const schema = z.object({
  firstName: z.string().trim().min(1, 'Вкажіть імʼя'),
  lastName: z.string().trim().min(1, 'Вкажіть прізвище'),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Вкажіть коректну електронну пошту'),
  phone: z.string(),
  country: z.string(),
  city: z.string(),
  notes: z.string(),
})

type GuestFormValues = z.infer<typeof schema>

export function GuestForm({
  guest,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  guest?: Guest
  submitLabel: string
  pending: boolean
  onSubmit: (values: GuestWriteInput) => void
  onCancel: () => void
}) {
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: guest?.firstName ?? '',
      lastName: guest?.lastName ?? '',
      email: guest?.email ?? '',
      phone: guest?.phone ?? '',
      country: guest?.country ?? '',
      city: guest?.city ?? '',
      notes: guest?.notes ?? '',
    },
  })
  const { errors } = form.formState

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          id: guest?.id,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          country: values.country,
          city: values.city,
          notes: values.notes,
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Імʼя *" htmlFor="guest-first-name" error={errors.firstName?.message}>
          <Input id="guest-first-name" autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} {...form.register('firstName')} />
        </Field>
        <Field label="Прізвище *" htmlFor="guest-last-name" error={errors.lastName?.message}>
          <Input id="guest-last-name" autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} {...form.register('lastName')} />
        </Field>
      </div>
      <Field label="Email" htmlFor="guest-email" error={errors.email?.message}>
        <Input id="guest-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
      </Field>
      <Field label="Телефон" htmlFor="guest-phone">
        <Input id="guest-phone" type="tel" autoComplete="tel" {...form.register('phone')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Країна" htmlFor="guest-country">
          <Input id="guest-country" autoComplete="country-name" {...form.register('country')} />
        </Field>
        <Field label="Місто" htmlFor="guest-city">
          <Input id="guest-city" autoComplete="address-level2" {...form.register('city')} />
        </Field>
      </div>
      <Field label="Примітки" htmlFor="guest-notes">
        <Textarea id="guest-notes" {...form.register('notes')} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Скасувати
        </Button>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
