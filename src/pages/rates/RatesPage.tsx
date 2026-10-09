import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getRoomType } from '@/api/accommodations'
import { getCancellationPolicy, getRatePlan } from '@/api/rates'
import { RoomTypePicker } from '@/components/accommodations/RoomTypePicker'
import { CancellationPolicyPicker } from '@/components/rates/CancellationPolicyPicker'
import { RatePlanPicker } from '@/components/rates/RatePlanPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminRatePlans,
  useAdminRoomPrices,
  useCreateAdminRatePlan,
  useCreateAdminRoomPrice,
  useDeleteAdminRoomPrice,
  useUpdateAdminRatePlan,
  useUpdateAdminRoomPrice,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoneyAmount, normalizeMoneyString, parseStayNights } from '@/lib/format'
import { ratePlanTypeLabel } from '@/lib/labels'
import { canManageRates } from '@/lib/roles'
import type { RatePlan, RatePlanType, RoomPrice } from '@/types'

const PAGE_SIZE = 20
const RATE_TYPES = ['STANDARD', 'NON_REFUNDABLE', 'SPECIAL'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONEY_RE = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/
const CODE_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/

export function RatesPage() {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  const [planPage, setPlanPage] = useState(1)
  const [pricePage, setPricePage] = useState(1)
  const [planSearch, setPlanSearch] = useState('')
  const [planSearchApplied, setPlanSearchApplied] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [editingPlan, setEditingPlan] = useState<RatePlan | 'new' | null>(null)
  const [editingPrice, setEditingPrice] = useState<RoomPrice | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RoomPrice | null>(null)
  const removePrice = useDeleteAdminRoomPrice()

  const plansQuery = useAdminRatePlans({
    page: planPage,
    limit: PAGE_SIZE,
    search: planSearchApplied || undefined,
  })
  const pricesQuery = useAdminRoomPrices({
    page: pricePage,
    limit: PAGE_SIZE,
    ratePlanId: planFilter || undefined,
  })

  const planItems = plansQuery.data?.items ?? []
  const priceItems = pricesQuery.data?.items ?? []

  const policyIds = useMemo(
    () => [...new Set(planItems.map((plan) => plan.cancellationPolicyId).filter(Boolean))] as string[],
    [planItems],
  )
  const policyQueries = useQueries({
    queries: policyIds.map((id) => ({
      queryKey: ['admin-cancellation-policy', id],
      queryFn: () => getCancellationPolicy(id),
      enabled: Boolean(id),
    })),
  })
  const policyById = useMemo(() => {
    const map = new Map<string, { name: string; active: boolean }>()
    policyIds.forEach((id, index) => {
      const policy = policyQueries[index]?.data
      if (policy) map.set(id, { name: policy.name, active: policy.active })
    })
    return map
  }, [policyIds, policyQueries])

  const roomTypeIds = useMemo(
    () => [...new Set(priceItems.map((item) => item.roomTypeId))],
    [priceItems],
  )
  const roomTypeQueries = useQueries({
    queries: roomTypeIds.map((id) => ({
      queryKey: ['admin-room-type', id],
      queryFn: () => getRoomType(id),
      enabled: Boolean(id),
    })),
  })
  const roomTypeNameById = useMemo(() => {
    const map = new Map<string, string>()
    roomTypeIds.forEach((id, index) => {
      const type = roomTypeQueries[index]?.data
      if (type) map.set(id, type.name)
    })
    return map
  }, [roomTypeIds, roomTypeQueries])

  const pricePlanIds = useMemo(
    () => [...new Set(priceItems.map((item) => item.ratePlanId))],
    [priceItems],
  )
  const pricePlanQueries = useQueries({
    queries: pricePlanIds.map((id) => ({
      queryKey: ['admin-rate-plan', id],
      queryFn: () => getRatePlan(id),
      enabled: Boolean(id),
    })),
  })
  const planNameById = useMemo(() => {
    const map = new Map<string, string>()
    pricePlanIds.forEach((id, index) => {
      const plan = pricePlanQueries[index]?.data
      if (plan) map.set(id, plan.name)
    })
    return map
  }, [pricePlanIds, pricePlanQueries])

  if (plansQuery.isLoading && !plansQuery.data) return <LoadingState />

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading
          title="Тарифні плани"
          action={
            canWrite ? <Button onClick={() => setEditingPlan('new')}>Додати тариф</Button> : undefined
          }
        />
        <form
          className="mb-4 flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setPlanSearchApplied(planSearch.trim())
            setPlanPage(1)
          }}
        >
          <Input
            value={planSearch}
            onChange={(event) => setPlanSearch(event.target.value)}
            placeholder="Пошук тарифів"
          />
          <Button type="submit" variant="outline">
            Знайти
          </Button>
        </form>
        {plansQuery.isError ? (
          <div className="space-y-3 py-6">
            <p className="text-sm">Не вдалося завантажити тарифи</p>
            <Button size="sm" variant="outline" onClick={() => void plansQuery.refetch()}>
              Спробувати ще раз
            </Button>
          </div>
        ) : null}
        {!plansQuery.isError && planItems.length === 0 ? (
          <EmptyState>Тарифів за цим запитом немає.</EmptyState>
        ) : null}
        {!plansQuery.isError && planItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Назва</TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Скасування</TableHead>
                <TableHead>Стан</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {planItems.map((plan) => {
                const policy = plan.cancellationPolicyId
                  ? policyById.get(plan.cancellationPolicyId)
                  : undefined
                const policyPending =
                  Boolean(plan.cancellationPolicyId) &&
                  !policy &&
                  policyQueries.some((query, index) => policyIds[index] === plan.cancellationPolicyId && query.isLoading)
                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>{plan.name}</div>
                      <div className="max-w-md text-xs text-muted-foreground">{plan.description ?? '—'}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{plan.code}</TableCell>
                    <TableCell>{ratePlanTypeLabel[plan.type]}</TableCell>
                    <TableCell>
                      {!plan.cancellationPolicyId ? (
                        '—'
                      ) : policyPending ? (
                        <span className="text-xs text-muted-foreground">Завантаження…</span>
                      ) : policy ? (
                        <div>
                          <div>{policy.name}</div>
                          {!policy.active ? (
                            <div className="text-xs text-muted-foreground">Вимкнене</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Не знайдено</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge tone={plan.active ? 'success' : 'neutral'}>
                        {plan.active ? 'Активний' : 'Вимкнений'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite ? (
                        <Button size="sm" variant="ghost" onClick={() => setEditingPlan(plan)}>
                          Редагувати
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Лише перегляд</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : null}
        <Pagination
          page={planPage}
          pageSize={PAGE_SIZE}
          total={plansQuery.data?.pagination.total ?? 0}
          onPageChange={setPlanPage}
        />
      </section>

      <section>
        <SectionHeading
          title="Ціни за періодами"
          action={
            canWrite ? <Button onClick={() => setEditingPrice('new')}>Додати період</Button> : undefined
          }
        />
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Період діє як піввідкритий інтервал [дата початку, дата кінця). Ціна зберігається як десятковий рядок.
        </p>
        <div className="mb-4 max-w-sm">
          <RatePlanPicker
            value={planFilter}
            allowEmpty
            emptyLabel="Усі тарифи"
            onChange={(value) => {
              setPlanFilter(value)
              setPricePage(1)
            }}
          />
        </div>
        {pricesQuery.isLoading && !pricesQuery.data ? <LoadingState /> : null}
        {pricesQuery.isError ? (
          <div className="space-y-3 py-6">
            <p className="text-sm">Не вдалося завантажити ціни</p>
            <Button size="sm" variant="outline" onClick={() => void pricesQuery.refetch()}>
              Спробувати ще раз
            </Button>
          </div>
        ) : null}
        {!pricesQuery.isLoading && !pricesQuery.isError && priceItems.length === 0 ? (
          <EmptyState>Цін за цим запитом немає.</EmptyState>
        ) : null}
        {!pricesQuery.isError && priceItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Тариф</TableHead>
                <TableHead>Категорія</TableHead>
                <TableHead>Період</TableHead>
                <TableHead>Ціна за ніч</TableHead>
                <TableHead>Мін. ночей</TableHead>
                <TableHead>Стан</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceItems.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{planNameById.get(price.ratePlanId) ?? '—'}</TableCell>
                  <TableCell>{roomTypeNameById.get(price.roomTypeId) ?? '—'}</TableCell>
                  <TableCell>
                    {formatDate(price.startDate)} — {formatDate(price.endDate)}
                    <span className="block text-xs text-muted-foreground">[початок, кінець)</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatMoneyAmount(price.price)}</TableCell>
                  <TableCell>
                    {price.minStay}
                    {price.maxStay !== null ? `–${price.maxStay}` : '+'}
                  </TableCell>
                  <TableCell>
                    <Badge tone={price.active ? 'success' : 'neutral'}>
                      {price.active ? 'Активна' : 'Вимкнена'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingPrice(price)}>
                          Редагувати
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(price)}>
                          Видалити
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
        <Pagination
          page={pricePage}
          pageSize={PAGE_SIZE}
          total={pricesQuery.data?.pagination.total ?? 0}
          onPageChange={setPricePage}
        />
      </section>

      <PlanDialog
        open={editingPlan !== null}
        item={editingPlan && editingPlan !== 'new' ? editingPlan : undefined}
        canWrite={canWrite}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      />
      <PriceDialog
        open={editingPrice !== null}
        item={editingPrice && editingPrice !== 'new' ? editingPrice : undefined}
        canWrite={canWrite}
        onOpenChange={(open) => !open && setEditingPrice(null)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити ціну?"
        description={
          pendingDelete
            ? `${formatDate(pendingDelete.startDate)} — ${formatDate(pendingDelete.endDate)} · ${formatMoneyAmount(pendingDelete.price)}`
            : ''
        }
        confirmLabel="Видалити"
        destructive
        pending={removePrice.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (!pendingDelete) return
          if (!canWrite) {
            toast.error('Недостатньо прав для цієї дії')
            setPendingDelete(null)
            return
          }
          void removePrice
            .mutateAsync(pendingDelete.id)
            .then(() => {
              setPendingDelete(null)
              toast.success('Ціну видалено')
            })
            .catch((error) => toast.error(ratesErrorMessage(error)))
        }}
      />
    </div>
  )
}

const planSchema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Назва задовга'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Вкажіть код')
    .max(80, 'Код задовгий')
    .regex(CODE_RE, 'Лише великі латинські літери, цифри та дефіси'),
  description: z.string().max(4000, 'Опис задовгий'),
  type: z.enum(RATE_TYPES),
  cancellationPolicyId: z.string(),
  active: z.enum(['yes', 'no']),
})

function PlanDialog({
  open,
  item,
  canWrite,
  onOpenChange,
}: {
  open: boolean
  item?: RatePlan
  canWrite: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateAdminRatePlan()
  const update = useUpdateAdminRatePlan()
  const pending = create.isPending || update.isPending
  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    values: {
      name: item?.name ?? '',
      code: item?.code ?? '',
      description: item?.description ?? '',
      type: item?.type ?? 'STANDARD',
      cancellationPolicyId: item?.cancellationPolicyId ?? '',
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати тариф' : 'Новий тариф'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              const input = {
                name: values.name,
                code: values.code,
                description: values.description.trim() ? values.description.trim() : null,
                type: values.type as RatePlanType,
                cancellationPolicyId: values.cancellationPolicyId.trim()
                  ? values.cancellationPolicyId.trim()
                  : null,
                active: values.active === 'yes',
              }
              if (item) {
                await update.mutateAsync({ id: item.id, input })
              } else {
                await create.mutateAsync(input)
              }
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(ratesErrorMessage(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <Field label="Код" error={form.formState.errors.code?.message} hint="Наприклад STD або FLEX-NR">
            <Input disabled={!canWrite} {...form.register('code')} />
          </Field>
          <Field label="Опис" error={form.formState.errors.description?.message}>
            <Textarea disabled={!canWrite} {...form.register('description')} />
          </Field>
          <Field label="Тип тарифу" error={form.formState.errors.type?.message}>
            <Select
              value={form.watch('type')}
              onValueChange={(value: RatePlanType) => form.setValue('type', value, { shouldValidate: true })}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ratePlanTypeLabel[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Правило скасування" error={form.formState.errors.cancellationPolicyId?.message}>
            <CancellationPolicyPicker
              value={form.watch('cancellationPolicyId')}
              activeOnly={!item}
              disabled={!canWrite}
              onChange={(value) => form.setValue('cancellationPolicyId', value, { shouldValidate: true })}
            />
          </Field>
          <Field label="Стан">
            <Select
              value={form.watch('active')}
              onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активний</SelectItem>
                <SelectItem value="no">Вимкнений</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canWrite || pending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const priceSchema = z
  .object({
    ratePlanId: z.string().min(1, 'Оберіть тариф'),
    roomTypeId: z.string().min(1, 'Оберіть категорію'),
    startDate: z.string().regex(DATE_RE, 'Дата у форматі РРРР-ММ-ДД'),
    endDate: z.string().regex(DATE_RE, 'Дата у форматі РРРР-ММ-ДД'),
    price: z
      .string()
      .trim()
      .regex(MONEY_RE, 'Невідʼємне число з не більше ніж двома знаками після коми'),
    minStay: z.string(),
    maxStay: z.string(),
    active: z.enum(['yes', 'no']),
  })
  .superRefine((values, ctx) => {
    if (values.endDate <= values.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Дата кінця має бути пізніше за дату початку',
      })
    }
    const minStay = parseStayNights(values.minStay)
    if (minStay === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['minStay'],
        message: 'Вкажіть ціле число ночей від 1',
      })
    }
    const maxTrimmed = values.maxStay.trim()
    if (maxTrimmed !== '') {
      const maxStay = parseStayNights(maxTrimmed)
      if (maxStay === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['maxStay'],
          message: 'Має бути цілим числом від 1 або порожнім',
        })
      } else if (minStay !== null && maxStay < minStay) {
        ctx.addIssue({
          code: 'custom',
          path: ['maxStay'],
          message: 'Максимум ночей не може бути меншим за мінімум',
        })
      }
    }
  })

function PriceDialog({
  open,
  item,
  canWrite,
  onOpenChange,
}: {
  open: boolean
  item?: RoomPrice
  canWrite: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateAdminRoomPrice()
  const update = useUpdateAdminRoomPrice()
  const pending = create.isPending || update.isPending
  const form = useForm<z.infer<typeof priceSchema>>({
    resolver: zodResolver(priceSchema),
    values: {
      ratePlanId: item?.ratePlanId ?? '',
      roomTypeId: item?.roomTypeId ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      price: item?.price ?? '',
      minStay: item ? String(item.minStay) : '1',
      maxStay: item?.maxStay === null || item?.maxStay === undefined ? '' : String(item.maxStay),
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати період' : 'Новий період'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            const price = normalizeMoneyString(values.price)
            if (!price) {
              form.setError('price', {
                message: 'Невідʼємне число з не більше ніж двома знаками після коми',
              })
              return
            }
            const minStay = parseStayNights(values.minStay)
            if (minStay === null) {
              form.setError('minStay', { message: 'Вкажіть ціле число ночей від 1' })
              return
            }
            const maxTrimmed = values.maxStay.trim()
            const maxStay = maxTrimmed === '' ? null : parseStayNights(maxTrimmed)
            if (maxTrimmed !== '' && maxStay === null) {
              form.setError('maxStay', { message: 'Має бути цілим числом від 1 або порожнім' })
              return
            }
            if (maxStay !== null && maxStay < minStay) {
              form.setError('maxStay', { message: 'Максимум ночей не може бути меншим за мінімум' })
              return
            }
            try {
              const input = {
                ratePlanId: values.ratePlanId,
                roomTypeId: values.roomTypeId,
                startDate: values.startDate,
                endDate: values.endDate,
                price,
                minStay,
                maxStay,
                active: values.active === 'yes',
              }
              if (item) {
                await update.mutateAsync({ id: item.id, input })
              } else {
                await create.mutateAsync(input)
              }
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(ratesErrorMessage(error))
            }
          })}
        >
          <Field label="Тариф" error={form.formState.errors.ratePlanId?.message}>
            <RatePlanPicker
              value={form.watch('ratePlanId')}
              activeOnly={!item}
              disabled={!canWrite}
              placeholder="Оберіть тариф"
              onChange={(value) => form.setValue('ratePlanId', value, { shouldValidate: true })}
            />
          </Field>
          <Field label="Категорія" error={form.formState.errors.roomTypeId?.message}>
            <RoomTypePicker
              value={form.watch('roomTypeId')}
              activeOnly={!item}
              disabled={!canWrite}
              onChange={(value) => form.setValue('roomTypeId', value, { shouldValidate: true })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Початок" error={form.formState.errors.startDate?.message}>
              <Input type="date" disabled={!canWrite} {...form.register('startDate')} />
            </Field>
            <Field
              label="Кінець (не включно)"
              error={form.formState.errors.endDate?.message}
              hint="Піввідкритий інтервал [початок, кінець)"
            >
              <Input type="date" disabled={!canWrite} {...form.register('endDate')} />
            </Field>
          </div>
          <Field label="Ціна за ніч, ₴" error={form.formState.errors.price?.message}>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              disabled={!canWrite}
              {...form.register('price')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Мін. ночей" error={form.formState.errors.minStay?.message}>
              <Input inputMode="numeric" disabled={!canWrite} {...form.register('minStay')} />
            </Field>
            <Field
              label="Макс. ночей"
              error={form.formState.errors.maxStay?.message}
              hint="Порожньо = без обмеження"
            >
              <Input inputMode="numeric" disabled={!canWrite} {...form.register('maxStay')} />
            </Field>
          </div>
          <Field label="Стан">
            <Select
              value={form.watch('active')}
              onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активна</SelectItem>
                <SelectItem value="no">Вимкнена</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canWrite || pending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ratesErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Недостатньо прав для цієї дії'
    if (error.code === 'RATE_PLAN_CODE_EXISTS') return 'Тариф з таким кодом уже існує'
    if (error.code === 'ROOM_PRICE_OVERLAP') {
      return 'Період ціни перетинається з активною ціною цього тарифу для цієї категорії'
    }
    if (error.code === 'RATE_PLAN_NOT_FOUND') return 'Тариф не знайдено'
    if (error.code === 'CANCELLATION_POLICY_NOT_FOUND') return 'Правило скасування не знайдено'
    if (error.code === 'ROOM_TYPE_NOT_FOUND') return 'Категорію не знайдено'
    if (error.code === 'ROOM_PRICE_NOT_FOUND') return 'Ціну не знайдено'
    if (error.details?.length) return error.details.join('. ')
    if (error.message) return error.message
  }
  return errorMessage(error)
}
