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
  })
  .superRefine((values, ctx) => {
    if (values.price === '0' || values.price === '0.0' || values.price === '0.00') {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Ціна має бути щонайменше 0.01 ₴.' })
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
        бронюваннях. Вимкнену послугу не можна додати до нового бронювання.
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
                  <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Активна' : 'Вимкнена'}</Badge>
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
      </ScrollableFormDialog>
    </Dialog>
  )
}
