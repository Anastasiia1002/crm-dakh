import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LoadingState, SectionHeading } from '@/components/ui/states'
import { Textarea } from '@/components/ui/textarea'
import { useDeletePolicy, usePolicies, useSavePolicy, useSettings, useUpdateSettings } from '@/hooks/useHotel'
import { errorMessage } from '@/lib/errors'
import type { CancellationPolicy } from '@/types'

const settingsSchema = z.object({
  checkInTime: z.string().min(1, 'Вкажіть час'),
  checkOutTime: z.string().min(1, 'Вкажіть час'),
  minNights: z.number({ invalid_type_error: 'Вкажіть число' }).int().min(1),
  maxNights: z.number({ invalid_type_error: 'Вкажіть число' }).int().min(1),
})

export function SettingsPage() {
  const settings = useSettings()
  const policies = usePolicies()
  const update = useUpdateSettings()
  const remove = useDeletePolicy()
  const [editing, setEditing] = useState<CancellationPolicy | 'new' | null>(null)

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    values: settings.data
      ? {
          checkInTime: settings.data.checkInTime,
          checkOutTime: settings.data.checkOutTime,
          minNights: settings.data.minNights,
          maxNights: settings.data.maxNights,
        }
      : undefined,
  })

  if (!settings.data || !policies.data) return <LoadingState />

  return (
    <div className="max-w-3xl space-y-14">
      <section>
        <SectionHeading title="Параметри бронювання" />
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await update.mutateAsync({ ...values, currency: 'UAH' })
              toast.success('Налаштування збережено')
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Час заїзду" error={form.formState.errors.checkInTime?.message}>
            <Input type="time" {...form.register('checkInTime')} />
          </Field>
          <Field label="Час виїзду" error={form.formState.errors.checkOutTime?.message}>
            <Input type="time" {...form.register('checkOutTime')} />
          </Field>
          <Field label="Мінімум ночей" error={form.formState.errors.minNights?.message}>
            <Input type="number" {...form.register('minNights', { valueAsNumber: true })} />
          </Field>
          <Field label="Максимум ночей" error={form.formState.errors.maxNights?.message}>
            <Input type="number" {...form.register('maxNights', { valueAsNumber: true })} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={update.isPending}>
              Зберегти
            </Button>
          </div>
        </form>
      </section>

      <section>
        <SectionHeading title="Правила скасування" action={<Button onClick={() => setEditing('new')}>Додати правило</Button>} />
        <div className="divide-y divide-border border-y border-border">
          {policies.data.map((policy) => (
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
            <dd>Гривня (₴)</dd>
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
