import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ScrollableFormDialog, formDialogSelectContentClass } from '@/components/pricing/ScrollableFormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { QueryErrorState } from '@/components/ui/page-status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminService,
  useCreateAdminService,
  useManagedAdminServices,
  useUpdateAdminService,
} from '@/hooks/useAdminServices'
import {
  ADMIN_SERVICE_DESCRIPTION_MAX,
  ADMIN_SERVICE_NAME_MAX,
  buildAdminServiceCreateBody,
  buildAdminServicePatchBody,
  filterManagedServices,
  formatCatalogPrice,
  isPubliclyBookableService,
  parseOptionalServiceQuantity,
  validateServiceQuantityBounds,
  type AdminManagedService,
  type ServiceStatusFilter,
} from '@/lib/admin-services'
import { createSubmitLock } from '@/lib/booking-form'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { canManageAdminServices } from '@/lib/roles'

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Вкажіть назву послуги.')
      .max(ADMIN_SERVICE_NAME_MAX, `Назва має бути до ${ADMIN_SERVICE_NAME_MAX} символів.`),
    description: z.string().max(ADMIN_SERVICE_DESCRIPTION_MAX, `Опис має бути до ${ADMIN_SERVICE_DESCRIPTION_MAX} символів.`),
    price: z.string().trim().min(1, 'Вкажіть ціну.'),
    active: z.enum(['yes', 'no']),
    bookable: z.boolean(),
    minQuantity: z.string(),
    maxQuantity: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.price === '0' || values.price === '0.0' || values.price === '0.00') {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Ціна має бути щонайменше 0.01 ₴.' })
    }
    const minQuantity = parseOptionalServiceQuantity(values.minQuantity)
    if (!minQuantity.ok) {
      ctx.addIssue({ code: 'custom', path: ['minQuantity'], message: minQuantity.error })
    }
    const maxQuantity = parseOptionalServiceQuantity(values.maxQuantity)
    if (!maxQuantity.ok) {
      ctx.addIssue({ code: 'custom', path: ['maxQuantity'], message: maxQuantity.error })
    }
    if (minQuantity.ok && maxQuantity.ok) {
      const bounds = validateServiceQuantityBounds(minQuantity.quantity, maxQuantity.quantity)
      if (bounds) ctx.addIssue({ code: 'custom', path: ['maxQuantity'], message: bounds })
    }
  })

type FormValues = z.infer<typeof schema>

export function ServicesPage() {
  const { user } = useAuth()
  const canWrite = canManageAdminServices(user?.role)
  const catalog = useManagedAdminServices()
  const update = useUpdateAdminService()
  const [editing, setEditing] = useState<AdminManagedService | 'new' | null>(null)
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminManagedService | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ServiceStatusFilter>('all')
  const items = catalog.data ?? []
  const visible = useMemo(() => filterManagedServices(items, { query, status }), [items, query, status])

  return (
    <div>
      <SectionHeading
        title="Додаткові послуги"
        action={canWrite ? <Button onClick={() => setEditing('new')}>Додати послугу</Button> : undefined}
      />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Каталог цього готелю, включно з вимкненими послугами. Ціни в гривнях. Нова ціна не змінює вже збережені рядки в
        бронюваннях. На сайті гість бачить лише активну послугу, яку окремо дозволено для онлайн-бронювання.
      </p>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Пошук за назвою"
          className="max-w-md"
        />
        <Select value={status} onValueChange={(value: ServiceStatusFilter) => setStatus(value)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Статус послуг">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі</SelectItem>
            <SelectItem value="active">Активні</SelectItem>
            <SelectItem value="inactive">Вимкнені</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {catalog.isLoading && !catalog.data ? <LoadingState label="Завантаження каталогу послуг…" /> : null}
      {catalog.isError ? (
        <QueryErrorState
          title="Не вдалося завантажити каталог послуг"
          error={catalog.error}
          onRetry={() => void catalog.refetch()}
        />
      ) : null}
      {!catalog.isLoading && !catalog.isError && items.length === 0 ? <EmptyState>Послуг ще немає.</EmptyState> : null}
      {!catalog.isError && items.length > 0 && visible.length === 0 ? (
        <EmptyState>Послуг за цим запитом немає.</EmptyState>
      ) : null}
      {!catalog.isError && visible.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Опис</TableHead>
              <TableHead>Ціна</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Оновлено</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.description || '—'}</TableCell>
                <TableCell className="tabular-nums">{formatCatalogPrice(item.price)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Активна' : 'Вимкнена'}</Badge>
                    <Badge tone={isPubliclyBookableService(item) ? 'confirmed' : 'neutral'}>
                      {isPubliclyBookableService(item) ? 'На сайті' : 'Лише в CRM'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                        Редагувати
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (item.active) {
                            setPendingDeactivate(item)
                            return
                          }
                          void update
                            .mutateAsync({ id: item.id, input: { active: true } })
                            .then(() => toast.success('Послугу увімкнено'))
                            .catch((error) => toast.error(errorMessage(error)))
                        }}
                      >
                        {item.active ? 'Вимкнути' : 'Увімкнути'}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Лише перегляд</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <ServiceDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        canWrite={canWrite}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Вимкнути послугу?"
        description="Вимкнути послугу? Її більше не можна буде додати до нових бронювань. У вже створених бронюваннях вона залишиться."
        confirmLabel="Вимкнути"
        destructive
        pending={update.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivate(null)
        }}
        onConfirm={() => {
          if (!pendingDeactivate) return
          if (!canWrite) {
            toast.error('Недостатньо прав для цієї дії')
            setPendingDeactivate(null)
            return
          }
          void update
            .mutateAsync({ id: pendingDeactivate.id, input: { active: false } })
            .then(() => {
              toast.success('Послугу вимкнено')
              setPendingDeactivate(null)
            })
            .catch((error) => toast.error(errorMessage(error)))
        }}
      />
    </div>
  )
}

function ServiceDialog({
  open,
  item,
  canWrite,
  onOpenChange,
}: {
  open: boolean
  item?: AdminManagedService
  canWrite: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateAdminService()
  const update = useUpdateAdminService()
  const detail = useAdminService(open && item ? item.id : undefined)
  const current = detail.data ?? item
  const pending = create.isPending || update.isPending
  const submitLock = useRef(createSubmitLock())
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: current?.name ?? '',
      description: current?.description ?? '',
      price: current?.price ?? '',
      active: current?.active === false ? 'no' : 'yes',
      bookable: current?.bookable ?? false,
      minQuantity: current?.minQuantity == null ? '' : String(current.minQuantity),
      maxQuantity: current?.maxQuantity == null ? '' : String(current.maxQuantity),
    },
  })
  const watchedPrice = form.watch('price')
  const priceChanged = Boolean(current && watchedPrice.trim() !== current.price)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableFormDialog
        title={item ? 'Редагувати послугу' : 'Додати послугу'}
        onSubmit={form.handleSubmit(async (values) => {
          if (!canWrite) {
            toast.error('Недостатньо прав для цієї дії')
            return
          }
          if (!submitLock.current.tryBegin()) return
          try {
            const formValues = {
              name: values.name,
              description: values.description,
              price: values.price,
              active: values.active === 'yes',
              bookable: values.bookable,
              minQuantity: values.minQuantity,
              maxQuantity: values.maxQuantity,
            }
            if (!item) {
              const created = buildAdminServiceCreateBody(formValues)
              if (!created.ok) {
                if (created.field) form.setError(created.field, { message: created.error })
                toast.error(created.error)
                return
              }
              await create.mutateAsync(created.body)
              toast.success('Послугу додано')
              onOpenChange(false)
              return
            }
            if (!current) {
              toast.error('Не вдалося завантажити послугу')
              return
            }
            const patched = buildAdminServicePatchBody(current, formValues)
            if (!patched.ok) {
              if ('empty' in patched) {
                toast.error('Немає змін для збереження')
                return
              }
              if (patched.field) form.setError(patched.field, { message: patched.error })
              toast.error(patched.error)
              return
            }
            await update.mutateAsync({ id: item.id, input: patched.body })
            toast.success('Збережено')
            onOpenChange(false)
          } catch (error) {
            toast.error(errorMessage(error))
          } finally {
            submitLock.current.end()
          }
        })}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canWrite || pending} loading={pending}>
              Зберегти
            </Button>
          </>
        }
      >
        {item && detail.isLoading && !detail.data ? <p className="text-sm text-muted-foreground">Завантаження послуги…</p> : null}
        {item && detail.isError ? (
          <QueryErrorState
            title="Не вдалося завантажити послугу"
            error={detail.error}
            onRetry={() => void detail.refetch()}
          />
        ) : null}
        <Field label="Назва" error={form.formState.errors.name?.message}>
          <Input disabled={!canWrite} {...form.register('name')} />
        </Field>
        <Field label="Опис" error={form.formState.errors.description?.message}>
          <Textarea disabled={!canWrite} {...form.register('description')} />
        </Field>
        <Field label="Ціна, ₴" error={form.formState.errors.price?.message}>
          <Input inputMode="decimal" disabled={!canWrite} {...form.register('price')} />
        </Field>
        {item && priceChanged ? (
          <p className="text-sm text-muted-foreground">
            Нова ціна застосовуватиметься до нових послуг у бронюваннях. Вартість уже збережених послуг не зміниться.
          </p>
        ) : null}
        <Field label="Активна">
          <Select
            value={form.watch('active')}
            onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}
            disabled={!canWrite}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={formDialogSelectContentClass} collisionPadding={16}>
              <SelectItem value="yes">Активна</SelectItem>
              <SelectItem value="no">Вимкнена</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="space-y-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={form.watch('bookable')}
            aria-describedby="service-bookable-hint"
            disabled={!canWrite}
            onClick={() => form.setValue('bookable', !form.getValues('bookable'), { shouldDirty: true })}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 text-left outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="text-sm">Доступна для онлайн-бронювання</span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full ${form.watch('bookable') ? 'bg-primary' : 'bg-[#ddd4c6]'}`}
              aria-hidden
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-surface ${form.watch('bookable') ? 'left-5' : 'left-0.5'}`}
              />
            </span>
          </button>
          <p id="service-bookable-hint" className="text-xs text-muted-foreground">
            Увімкніть, щоб гість міг додати послугу під час онлайн-бронювання. Вимкнена послуга на сайті не з’являється.
          </p>
          {form.watch('active') === 'no' && form.watch('bookable') ? (
            <p className="text-xs text-muted-foreground">На сайті послуга не з’явиться, доки вона вимкнена.</p>
          ) : null}
        </div>
        <Field label="Нарахування" hint="Вартість додається один раз до всього бронювання. Інші способи нарахування не підтримуються.">
          <p className="flex min-h-11 items-center rounded-md border border-border bg-surface-muted px-3 text-sm">За бронювання</p>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Мінімальна кількість"
            htmlFor="service-min-quantity"
            error={form.formState.errors.minQuantity?.message}
            hint="Необов’язково. Якщо порожньо, гість може обрати від 1."
          >
            <Input
              id="service-min-quantity"
              inputMode="numeric"
              disabled={!canWrite}
              placeholder="1"
              {...form.register('minQuantity')}
            />
          </Field>
          <Field
            label="Максимальна кількість"
            htmlFor="service-max-quantity"
            error={form.formState.errors.maxQuantity?.message}
            hint="Необов’язково. Якщо порожньо, максимум 99."
          >
            <Input
              id="service-max-quantity"
              inputMode="numeric"
              disabled={!canWrite}
              placeholder="99"
              {...form.register('maxQuantity')}
            />
          </Field>
        </div>
      </ScrollableFormDialog>
    </Dialog>
  )
}
