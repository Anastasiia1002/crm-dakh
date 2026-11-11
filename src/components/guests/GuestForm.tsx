import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AdminGuestIdentity, GuestWriteInput } from '@/lib/admin-guests'

const schema = z.object({
  firstName: z.string().trim().min(1, 'Вкажіть імʼя'),
  lastName: z.string().trim().min(1, 'Вкажіть прізвище'),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Вкажіть коректну електронну пошту'),
  phone: z.string(),
  notes: z.string(),
})

type GuestFormValues = z.infer<typeof schema>

export function GuestForm({
  guest,
  contactLocked = false,
  submitLabel,
  pending,
  confirmDuplicate,
  reuseContact,
  onConfirmDuplicate,
  onReuseContact,
  duplicateHint,
  onSubmit,
  onCancel,
}: {
  guest?: AdminGuestIdentity
  contactLocked?: boolean
  submitLabel: string
  pending: boolean
  confirmDuplicate?: boolean
  reuseContact?: boolean
  onConfirmDuplicate?: (value: boolean) => void
  onReuseContact?: (value: boolean) => void
  duplicateHint?: string | null
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
      notes: guest?.notes ?? '',
    },
  })
  const { errors } = form.formState

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email || undefined,
          phone: values.phone || undefined,
          notes: values.notes || undefined,
          confirmDuplicate,
          reuseContact,
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Імʼя *" htmlFor="guest-first-name" error={errors.firstName?.message}>
          <Input
            id="guest-first-name"
            autoComplete="given-name"
            disabled={contactLocked}
            aria-invalid={Boolean(errors.firstName)}
            {...form.register('firstName')}
          />
        </Field>
        <Field label="Прізвище *" htmlFor="guest-last-name" error={errors.lastName?.message}>
          <Input
            id="guest-last-name"
            autoComplete="family-name"
            disabled={contactLocked}
            aria-invalid={Boolean(errors.lastName)}
            {...form.register('lastName')}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="guest-email" error={errors.email?.message}>
        <Input
          id="guest-email"
          type="email"
          autoComplete="email"
          disabled={contactLocked}
          aria-invalid={Boolean(errors.email)}
          {...form.register('email')}
        />
      </Field>
      <Field label="Телефон" htmlFor="guest-phone">
        <Input id="guest-phone" type="tel" autoComplete="tel" disabled={contactLocked} {...form.register('phone')} />
      </Field>
      {contactLocked ? (
        <p className="text-sm text-muted-foreground">
          Імʼя, email і телефон спільні з іншим готелем. Змініть лише внутрішній коментар цього готелю.
        </p>
      ) : null}
      <Field label="Внутрішній коментар" htmlFor="guest-notes">
        <Textarea id="guest-notes" {...form.register('notes')} />
      </Field>
      {duplicateHint ? <p className="text-sm text-destructive">{duplicateHint}</p> : null}
      {onConfirmDuplicate ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(confirmDuplicate)} onChange={(event) => onConfirmDuplicate(event.target.checked)} />
          Це інша людина з таким самим телефоном у цьому готелі
        </label>
      ) : null}
      {onReuseContact ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(reuseContact)} onChange={(event) => onReuseContact(event.target.checked)} />
          Приєднати наявний контакт без зміни імені та телефону
        </label>
      ) : null}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Скасувати
        </Button>
        <Button type="submit" disabled={pending} loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
