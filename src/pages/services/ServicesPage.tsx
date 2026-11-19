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
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useCreateAdminService,
  useManagedAdminServices,
  useUpdateAdminService,
} from '@/hooks/useAdminServices'
import {
  ADMIN_SERVICE_CATEGORY_MAX,
  ADMIN_SERVICE_CHARGE_BASES,
  ADMIN_SERVICE_DESCRIPTION_MAX,
  ADMIN_SERVICE_NAME_MAX,
  SERVICE_CHARGE_BASIS_LABEL,
  SERVICE_DEFAULT_CREATE_PRICE,
  SERVICE_PRICE_UNSET_LABEL,
  SERVICE_CRM_BADGE,
  SERVICE_ONLINE_UNAVAILABLE_BADGE,
  SERVICE_PUBLIC_NEEDS_PRICE,
  SERVICE_SITE_BADGE,
  buildAdminServiceCreateBody,
  buildAdminServicePatchBody,
  canEnablePublicOnlineBooking,
  filterManagedServices,
  formatManagedServicePrice,
  parseOptionalServiceQuantity,
  serviceOnlineFieldHint,
  serviceOnlineUnavailableReason,
  serviceSiteVisibilityLabel,
  parseOptionalServiceSortOrder,
  validateOptionalServicePrice,
  validateServiceQuantityBounds,
  type AdminManagedService,
  type AdminServiceChargeBasis,
  type ServiceStatusFilter,
} from '@/lib/admin-services'
import { createSubmitLock } from '@/lib/booking-form'
import { errorMessage } from '@/lib/errors'
import { canManageAdminServices } from '@/lib/roles'

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Вкажіть назву послуги.')
      .max(ADMIN_SERVICE_NAME_MAX, `Назва має бути до ${ADMIN_SERVICE_NAME_MAX} символів.`),
    description: z.string().max(ADMIN_SERVICE_DESCRIPTION_MAX, `Опис має бути до ${ADMIN_SERVICE_DESCRIPTION_MAX} символів.`),
    price: z.string(),
    active: z.enum(['yes', 'no']),
    bookable: z.boolean(),
    chargeBasis: z.enum(ADMIN_SERVICE_CHARGE_BASES),
    minQuantity: z.string(),
    maxQuantity: z.string(),
    sortOrder: z.string(),
    category: z.string().max(ADMIN_SERVICE_CATEGORY_MAX, `Категорія має бути до ${ADMIN_SERVICE_CATEGORY_MAX} символів.`),
  })
  .superRefine((values, ctx) => {
    const price = validateOptionalServicePrice(values.price)
    if (!price.ok) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: price.error })
    } else if (values.bookable && canEnablePublicOnlineBooking(values.chargeBasis) && price.price === null) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: SERVICE_PUBLIC_NEEDS_PRICE })
    }
    const sortOrder = parseOptionalServiceSortOrder(values.sortOrder)
    if (!sortOrder.ok) {
      ctx.addIssue({ code: 'custom', path: ['sortOrder'], message: sortOrder.error })
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
    <div className="space-y-4">
      <PageHeader
        title="Додаткові послуги"
        description={`Каталог цього готелю, включно з вимкненими. Порожня ціна — ${SERVICE_PRICE_UNSET_LABEL.toLowerCase()}, не безкоштовна послуга. Нова ціна не змінює вже збережені рядки в бронюваннях.`}
        actions={canWrite ? <Button onClick={() => setEditing('new')}>Додати послугу</Button> : undefined}
      />
      <div className="filter-toolbar rounded-md border border-border bg-surface p-3">
        <label className="min-w-[12rem] flex-1 space-y-1.5">
          <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Пошук</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук за назвою"
            aria-label="Пошук за назвою"
          />
        </label>
        <label className="space-y-1.5">
          <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Статус</span>
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
        </label>
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
        <>
          <div className="hidden md:block">
            <Table containerClassName="rounded-md border border-border bg-surface">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Назва</TableHead>
                  <TableHead>Ціна</TableHead>
                  <TableHead>Нарахування</TableHead>
                  <TableHead>Доступність</TableHead>
                  <TableHead stickyActions>
                    <span className="sr-only">Дії</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[18rem]">
                      <p className="font-medium" title={item.name}>
                        {item.name}
                      </p>
                      {item.description ? (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={item.description}>
                          {item.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatManagedServicePrice(item.price)}</TableCell>
                    <TableCell>{SERVICE_CHARGE_BASIS_LABEL[item.chargeBasis]}</TableCell>
                    <TableCell>
                      <ServiceAvailability item={item} />
                    </TableCell>
                    <TableCell stickyActions className="text-right">
                      <ServiceActions
                        item={item}
                        canWrite={canWrite}
                        onEdit={() => setEditing(item)}
                        onToggle={() => {
                          if (item.active) {
                            setPendingDeactivate(item)
                            return
                          }
                          void update
                            .mutateAsync({ id: item.id, input: { active: true } })
                            .then(() => toast.success('Послугу увімкнено'))
                            .catch((error) => toast.error(errorMessage(error)))
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface md:hidden">
            {visible.map((item) => (
              <li key={item.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-0.5 text-sm tabular-nums">
                      {formatManagedServicePrice(item.price)}
                      <span className="text-muted-foreground"> · {SERVICE_CHARGE_BASIS_LABEL[item.chargeBasis]}</span>
                    </p>
                  </div>
                  <ServiceAvailability item={item} />
                </div>
                <ServiceActions
                  item={item}
                  canWrite={canWrite}
                  onEdit={() => setEditing(item)}
                  onToggle={() => {
                    if (item.active) {
                      setPendingDeactivate(item)
                      return
                    }
                    void update
                      .mutateAsync({ id: item.id, input: { active: true } })
                      .then(() => toast.success('Послугу увімкнено'))
                      .catch((error) => toast.error(errorMessage(error)))
                  }}
                />
              </li>
            ))}
          </ul>
        </>
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

function ServiceAvailability({ item }: { item: AdminManagedService }) {
  const visibility = serviceSiteVisibilityLabel(item)
  const reason = serviceOnlineUnavailableReason(item)
  const visibilityTone =
    visibility === SERVICE_SITE_BADGE
      ? 'confirmed'
      : visibility === SERVICE_ONLINE_UNAVAILABLE_BADGE
        ? 'warning'
        : visibility === SERVICE_CRM_BADGE
          ? 'neutral'
          : 'neutral'
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Активна' : 'Вимкнена'}</Badge>
        <Badge tone={visibilityTone}>{visibility}</Badge>
      </div>
      {reason ? <p className="text-xs text-muted-foreground">{reason}</p> : null}
    </div>
  )
}

function ServiceActions({
  item,
  canWrite,
  onEdit,
  onToggle,
}: {
  item: AdminManagedService
  canWrite: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  if (!canWrite) return <span className="text-xs text-muted-foreground">Лише перегляд</span>
  return (
    <ActionsMenu label={`Дії для послуги ${item.name}`}>
      <DropdownMenuItem onSelect={onEdit}>Редагувати</DropdownMenuItem>
      <DropdownMenuItem onSelect={onToggle}>{item.active ? 'Вимкнути' : 'Увімкнути'}</DropdownMenuItem>
    </ActionsMenu>
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
  const current = item
  const pending = create.isPending || update.isPending
  const submitLock = useRef(createSubmitLock())
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: current?.name ?? '',
      description: current?.description ?? '',
      price: item ? (current?.price ?? '') : SERVICE_DEFAULT_CREATE_PRICE,
      active: item ? (current?.active ? 'yes' : 'no') : 'yes',
      bookable: current?.bookable ?? false,
      chargeBasis: current?.chargeBasis ?? 'PER_STAY',
      minQuantity: current?.minQuantity == null ? '' : String(current.minQuantity),
      maxQuantity: current?.maxQuantity == null ? '' : String(current.maxQuantity),
      sortOrder: current?.sortOrder ? String(current.sortOrder) : '',
      category: current?.category ?? '',
    },
  })
  const watchedPrice = form.watch('price')
  const watchedChargeBasis = form.watch('chargeBasis')
  const watchedBookable = form.watch('bookable')
  const liveOnline = canEnablePublicOnlineBooking(watchedChargeBasis)
  const canToggleOnline = canWrite && (liveOnline || Boolean(current?.bookable))
  const priceChanged = Boolean(current && watchedPrice.trim() !== (current.price ?? ''))

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
              chargeBasis: values.chargeBasis,
              minQuantity: values.minQuantity,
              maxQuantity: values.maxQuantity,
              sortOrder: values.sortOrder,
              category: values.category,
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
        <Field label="Назва" error={form.formState.errors.name?.message}>
          <Input disabled={!canWrite} {...form.register('name')} />
        </Field>
        <Field label="Опис" error={form.formState.errors.description?.message}>
          <Textarea disabled={!canWrite} {...form.register('description')} />
        </Field>
        <Field
          label="Ціна, ₴"
          error={form.formState.errors.price?.message}
          hint={`Порожнє поле — ${SERVICE_PRICE_UNSET_LABEL.toLowerCase()}. Це не безкоштовна послуга.`}
        >
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
            disabled={!canToggleOnline || (!liveOnline && !watchedBookable)}
            onClick={() => {
              if (!liveOnline && !form.getValues('bookable')) return
              form.setValue('bookable', !form.getValues('bookable'), { shouldDirty: true })
            }}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 text-left outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="text-sm">Доступна для онлайн-бронювання</span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full ${form.watch('bookable') ? 'bg-primary' : 'bg-surface-muted'}`}
              aria-hidden
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-surface ${form.watch('bookable') ? 'left-5' : 'left-0.5'}`}
              />
            </span>
          </button>
          <p id="service-bookable-hint" className="text-xs text-muted-foreground">
            {serviceOnlineFieldHint({
              bookable: form.watch('bookable'),
              active: form.watch('active') === 'yes',
              chargeBasis: watchedChargeBasis,
            })}
          </p>
        </div>
        <Field label="Нарахування" error={form.formState.errors.chargeBasis?.message}>
          <Select
            value={watchedChargeBasis}
            onValueChange={(value: AdminServiceChargeBasis) => form.setValue('chargeBasis', value, { shouldDirty: true })}
            disabled={!canWrite}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={formDialogSelectContentClass} collisionPadding={16}>
              {ADMIN_SERVICE_CHARGE_BASES.map((basis) => (
                <SelectItem key={basis} value={basis}>
                  {SERVICE_CHARGE_BASIS_LABEL[basis]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Порядок" htmlFor="service-sort-order" error={form.formState.errors.sortOrder?.message}>
            <Input id="service-sort-order" inputMode="numeric" disabled={!canWrite} placeholder="0" {...form.register('sortOrder')} />
          </Field>
          <Field label="Категорія" htmlFor="service-category" error={form.formState.errors.category?.message} hint="Необов’язково.">
            <Input id="service-category" disabled={!canWrite} {...form.register('category')} />
          </Field>
        </div>
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
