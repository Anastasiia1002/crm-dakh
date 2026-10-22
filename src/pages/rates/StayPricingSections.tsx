import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getRoomType } from '@/api/accommodations'
import { getRatePlan } from '@/api/rates'
import { RatePlanPicker } from '@/components/rates/RatePlanPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminDayPriceRules,
  useAdminLengthStayDiscounts,
  useAdminRooms,
  useCreateAdminDayPriceRule,
  useCreateAdminLengthStayDiscount,
  useDeleteAdminDayPriceRule,
  useDeleteAdminLengthStayDiscount,
  usePreviewAdminDayPrice,
  usePreviewAdminLengthStay,
  useUpdateAdminDayPriceRule,
  useUpdateAdminLengthStayDiscount,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoneyAmount, normalizeMoneyString, parseStayNights } from '@/lib/format'
import {
  allCategoriesScopeCopy,
  categoryScopeCopy,
  categoryUnitCount,
  roomTypeIdsForUnits,
  selectedCategoriesScopeCopy,
  unselectedUnitsSharingType,
} from '@/lib/pricing-scope'
import { canManageRates } from '@/lib/roles'
import type { DayPricePreview, DayPriceRule, LengthStayDiscount } from '@/types'

function unitDisplayTitle(unit: { name: string | null; number: string }) {
  const name = unit.name?.trim()
  if (name) return name
  return unit.number.trim() || 'Розміщення'
}

const PAGE_SIZE = 20
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONEY_RE = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/
const WEEKDAYS = [
  { id: 1, label: 'Пн' },
  { id: 2, label: 'Вт' },
  { id: 3, label: 'Ср' },
  { id: 4, label: 'Чт' },
  { id: 5, label: 'Пт' },
  { id: 6, label: 'Сб' },
  { id: 7, label: 'Нд' },
] as const

export function StayPricingSections() {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  return (
    <>
      <DayPriceSection canWrite={canWrite} />
      <LengthStaySection canWrite={canWrite} />
    </>
  )
}

function DayPriceSection({ canWrite }: { canWrite: boolean }) {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<DayPriceRule | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DayPriceRule | null>(null)
  const query = useAdminDayPriceRules({ page, limit: PAGE_SIZE })
  const unitsQuery = useAdminRooms({ page: 1, limit: 100 })
  const remove = useDeleteAdminDayPriceRule()
  const items = query.data?.items ?? []
  const units = unitsQuery.data?.items ?? []
  const names = useNames(
    items.map((item) => item.ratePlanId),
    items.map((item) => item.roomTypeId),
  )

  return (
    <section>
      <SectionHeading
        title="Сезонні ціни"
        action={canWrite ? <Button onClick={() => setEditing('new')}>Додати правило</Button> : undefined}
      />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Щоб задати зиму: оберіть сезон, наприклад «Зимовий сезон», номери чи будиночки, дати, звичайну ціну на
        неділю–четвер і ціну на пʼятницю–суботу. Правило діє на категорію, а не на окремий номер: якщо кілька
        розміщень мають одну назву типу, ціна спільна для всіх. Базове покриття періоду ціни лишається.
      </p>
      {query.isLoading && !query.data ? <LoadingState /> : null}
      {query.isError ? (
        <p className="text-sm text-destructive">Не вдалося завантажити правила</p>
      ) : null}
      {!query.isLoading && !query.isError && items.length === 0 ? <EmptyState>Правил ще немає.</EmptyState> : null}
      {!query.isError && items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>Розміщення</TableHead>
              <TableHead>Будень</TableHead>
              <TableHead>Вихідні</TableHead>
              <TableHead>Дні вихідних</TableHead>
              <TableHead>Період</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{names.plan(rule.ratePlanId)}</TableCell>
                <TableCell>
                  <p>{names.type(rule.roomTypeId)}</p>
                  <p className="text-xs text-muted-foreground">{categoryScopeCopy(categoryUnitCount(units, rule.roomTypeId))}</p>
                </TableCell>
                <TableCell className="tabular-nums">{formatMoneyAmount(rule.weekdayPrice)}</TableCell>
                <TableCell className="tabular-nums">{formatMoneyAmount(rule.weekendPrice)}</TableCell>
                <TableCell>{weekendLabel(rule.weekendDays)}</TableCell>
                <TableCell>
                  {formatDate(rule.startDate)} — {formatDate(rule.endDate)}
                </TableCell>
                <TableCell>
                  <Badge tone={rule.active ? 'success' : 'neutral'}>{rule.active ? 'Активне' : 'Вимкнене'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(rule)}>
                        Редагувати
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(rule)}>
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
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.pagination.total ?? 0} onPageChange={setPage} />
      <DayPriceDialog open={editing !== null} item={editing && editing !== 'new' ? editing : undefined} canWrite={canWrite} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити правило?"
        description="Існуючі бронювання не зміняться. Нові розрахунки знову використовуватимуть лише період ціни."
        confirmLabel="Видалити"
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          void remove
            .mutateAsync(pendingDelete.id)
            .then(() => {
              toast.success('Видалено')
              setPendingDelete(null)
            })
            .catch((error) => toast.error(pricingError(error)))
        }}
      />
    </section>
  )
}

function LengthStaySection({ canWrite }: { canWrite: boolean }) {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<LengthStayDiscount | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<LengthStayDiscount | null>(null)
  const query = useAdminLengthStayDiscounts({ page, limit: PAGE_SIZE })
  const remove = useDeleteAdminLengthStayDiscount()
  const items = query.data?.items ?? []

  return (
    <section>
      <SectionHeading
        title="Знижки за тривалість проживання"
        action={canWrite ? <Button onClick={() => setEditing('new')}>Додати знижку</Button> : undefined}
      />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Щоб дати 10% від 6 ночей, створіть правило з мінімумом 6 ночей і знижкою 10%. Воно діє лише на проживання,
        не на послуги, і на всі одиниці обраного типу. Окремого правила на один номер немає. Якщо гість має промокод,
        більша знижка перемагає, суми не складаються. Якщо суми однакові, лишається промокод.
      </p>
      {query.isLoading && !query.data ? <LoadingState /> : null}
      {query.isError ? <p className="text-sm text-destructive">Не вдалося завантажити знижки</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? <EmptyState>Знижок ще немає.</EmptyState> : null}
      {!query.isError && items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Від</TableHead>
              <TableHead>Знижка</TableHead>
              <TableHead>Категорії</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{rule.minNights} ночей</TableCell>
                <TableCell>{rule.discountValue}%</TableCell>
                <TableCell>{selectedCategoriesScopeCopy(rule.roomTypeIds.length)}</TableCell>
                <TableCell>
                  <Badge tone={rule.active ? 'success' : 'neutral'}>{rule.active ? 'Активна' : 'Вимкнена'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(rule)}>
                        Редагувати
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(rule)}>
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
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.pagination.total ?? 0} onPageChange={setPage} />
      <LengthStayDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        canWrite={canWrite}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити знижку?"
        description="Існуючі бронювання збережуть свою зафіксовану суму."
        confirmLabel="Видалити"
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          void remove
            .mutateAsync(pendingDelete.id)
            .then(() => {
              toast.success('Видалено')
              setPendingDelete(null)
            })
            .catch((error) => toast.error(pricingError(error)))
        }}
      />
    </section>
  )
}

const daySchema = z
  .object({
    seasonName: z.string().trim().min(1, 'Вкажіть назву сезону').max(80, 'Назва до 80 символів'),
    ratePlanId: z.string().min(1, 'Оберіть тариф'),
    unitIds: z.array(z.string()).min(1, 'Оберіть хоча б одне розміщення'),
    weekdayPrice: z.string().trim().regex(MONEY_RE, 'Невідʼємне число з не більше ніж двома знаками після коми'),
    weekendPrice: z.string().trim().regex(MONEY_RE, 'Невідʼємне число з не більше ніж двома знаками після коми'),
    weekendDays: z.array(z.number()).min(1, 'Оберіть хоча б один вихідний день'),
    startDate: z.string().regex(DATE_RE, 'Дата у форматі РРРР-ММ-ДД'),
    endDate: z.string().regex(DATE_RE, 'Дата у форматі РРРР-ММ-ДД'),
    active: z.enum(['yes', 'no']),
  })
  .superRefine((values, ctx) => {
    if (values.endDate <= values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Дата кінця має бути пізніше за дату початку' })
    }
  })

function DayPriceDialog({
  open,
  item,
  canWrite,
  onOpenChange,
}: {
  open: boolean
  item?: DayPriceRule
  canWrite: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateAdminDayPriceRule()
  const update = useUpdateAdminDayPriceRule()
  const preview = usePreviewAdminDayPrice()
  const unitsQuery = useAdminRooms({ page: 1, limit: 100, active: true })
  const pending = create.isPending || update.isPending
  const [previewNights, setPreviewNights] = useState<DayPricePreview['nights']>([])
  const [previewTotal, setPreviewTotal] = useState<string | null>(null)
  const catalog = useMemo(
    () =>
      (unitsQuery.data?.items ?? []).map((unit) => ({
        id: unit.id,
        roomTypeId: unit.roomTypeId,
        title: unitDisplayTitle(unit),
      })),
    [unitsQuery.data?.items],
  )
  const initialUnits = item ? catalog.filter((unit) => unit.roomTypeId === item.roomTypeId).map((unit) => unit.id) : []
  const form = useForm<z.infer<typeof daySchema>>({
    resolver: zodResolver(daySchema),
    values: {
      seasonName: item?.name ?? 'Зимовий сезон 2026–2027',
      ratePlanId: item?.ratePlanId ?? '',
      unitIds: initialUnits,
      weekdayPrice: item?.weekdayPrice ?? '',
      weekendPrice: item?.weekendPrice ?? '',
      weekendDays: item?.weekendDays ?? [5, 6],
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      active: item?.active === false ? 'no' : 'yes',
    },
  })
  const weekendDays = form.watch('weekendDays')
  const unitIds = form.watch('unitIds')
  const shared = unselectedUnitsSharingType(catalog, unitIds)
  const typeIds = roomTypeIdsForUnits(catalog, unitIds)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати сезон' : 'Новий сезон'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            const weekdayPrice = normalizeMoneyString(values.weekdayPrice)
            const weekendPrice = normalizeMoneyString(values.weekendPrice)
            if (!weekdayPrice || !weekendPrice) {
              toast.error('Перевірте суми')
              return
            }
            const selectedTypes = roomTypeIdsForUnits(catalog, values.unitIds)
            if (selectedTypes.length === 0) {
              toast.error('Оберіть розміщення')
              return
            }
            if (item && (selectedTypes.length !== 1 || selectedTypes[0] !== item.roomTypeId)) {
              toast.error('Редагування змінює одне спільне правило. Інше розміщення додайте окремим сезоном.')
              return
            }
            try {
              const base = {
                name: values.seasonName.trim(),
                ratePlanId: values.ratePlanId,
                weekdayPrice,
                weekendPrice,
                weekendDays: values.weekendDays,
                startDate: values.startDate,
                endDate: values.endDate,
                active: values.active === 'yes',
              }
              if (item) await update.mutateAsync({ id: item.id, input: { ...base, roomTypeId: item.roomTypeId } })
              else {
                for (const roomTypeId of selectedTypes) {
                  await create.mutateAsync({ ...base, roomTypeId })
                }
              }
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(pricingError(error))
            }
          })}
        >
          <Field label="Назва сезону" hint="Зберігається і показується в списку. Наприклад, «Зимовий сезон 2026–2027»." error={form.formState.errors.seasonName?.message}>
            <Input disabled={!canWrite} {...form.register('seasonName')} />
          </Field>
          <Field label="Тариф" error={form.formState.errors.ratePlanId?.message}>
            <RatePlanPicker
              value={form.watch('ratePlanId')}
              activeOnly={!item}
              disabled={!canWrite}
              placeholder="Оберіть тариф"
              onChange={(value) => form.setValue('ratePlanId', value, { shouldValidate: true })}
            />
          </Field>
          <Field
            label="Розміщення"
            hint="Можна обрати кілька. Ціна записується на їхній тип і діє на всі одиниці цього типу, навіть якщо їх не відмітили."
            error={form.formState.errors.unitIds?.message}
          >
            <div className="max-h-40 space-y-2 overflow-auto rounded border border-border p-2">
              {catalog.map((unit) => (
                <label key={unit.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={unitIds.includes(unit.id)}
                    disabled={!canWrite}
                    onCheckedChange={(checked) => {
                      const next = checked === true ? [...unitIds, unit.id] : unitIds.filter((id) => id !== unit.id)
                      form.setValue('unitIds', next, { shouldValidate: true })
                    }}
                  />
                  {unit.title}
                </label>
              ))}
            </div>
          </Field>
          {shared.map((group) => (
            <p key={group.roomTypeId} className="text-sm text-muted-foreground">
              Цю ціну також отримають: {group.titles.join(', ')}. Окремої ціни для одного номера немає.
            </p>
          ))}
          {typeIds.length > 1 ? (
            <p className="text-sm text-muted-foreground">Буде збережено {typeIds.length} правила з однаковими цінами, по одному на тип.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Звичайна ціна за ніч, ₴" hint="Неділя–четвер, якщо вихідні — пʼятниця і субота" error={form.formState.errors.weekdayPrice?.message}>
              <Input inputMode="decimal" disabled={!canWrite} {...form.register('weekdayPrice')} />
            </Field>
            <Field label="Ціна вихідної ночі, ₴" error={form.formState.errors.weekendPrice?.message}>
              <Input inputMode="decimal" disabled={!canWrite} {...form.register('weekendPrice')} />
            </Field>
          </div>
          <Field label="Вихідні ночі" error={form.formState.errors.weekendDays?.message} hint="За замовчуванням пʼятниця та субота">
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => (
                <label key={day.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={weekendDays.includes(day.id)}
                    disabled={!canWrite}
                    onCheckedChange={(checked) => {
                      const next = checked === true ? [...weekendDays, day.id] : weekendDays.filter((value) => value !== day.id)
                      form.setValue('weekendDays', next, { shouldValidate: true })
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Перша ніч" hint="Ця дата входить у сезон" error={form.formState.errors.startDate?.message}>
              <Input type="date" disabled={!canWrite} {...form.register('startDate')} />
            </Field>
            <Field
              label="Дата після останньої ночі"
              hint="Остання ніч сезону — попередній день. Сама ця дата не має нічної ціни, як ранок виїзду."
              error={form.formState.errors.endDate?.message}
            >
              <Input type="date" disabled={!canWrite} {...form.register('endDate')} />
            </Field>
          </div>
          <Field label="Стан">
            <Select value={form.watch('active')} onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)} disabled={!canWrite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активне</SelectItem>
                <SelectItem value="no">Вимкнене</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={typeIds.length === 0 || !form.watch('ratePlanId') || !form.watch('startDate') || !form.watch('endDate')}
            onClick={async () => {
              const weekdayPrice = normalizeMoneyString(form.getValues('weekdayPrice'))
              const weekendPrice = normalizeMoneyString(form.getValues('weekendPrice'))
              if (!weekdayPrice || !weekendPrice) {
                toast.error('Вкажіть обидві ціни перед переглядом')
                return
              }
              try {
                const result = await preview.mutateAsync({
                  ratePlanId: form.getValues('ratePlanId'),
                  roomTypeId: typeIds[0]!,
                  startDate: form.getValues('startDate'),
                  endDate: form.getValues('endDate'),
                  weekdayPrice,
                  weekendPrice,
                  weekendDays: form.getValues('weekendDays'),
                  excludeRuleId: item?.id,
                })
                setPreviewNights(result.nights)
                setPreviewTotal(result.roomSubtotal)
              } catch (error) {
                setPreviewNights([])
                setPreviewTotal(null)
                toast.error(pricingError(error))
              }
            }}
          >
            Переглянути ночі
          </Button>
          {previewTotal ? (
            <div className="space-y-1 text-sm">
              <p>Сума ночей у перегляді: {formatMoneyAmount(previewTotal)}</p>
              <ul className="max-h-36 space-y-1 overflow-auto text-muted-foreground">
                {previewNights.slice(0, 21).map((night) => (
                  <li key={night.date} className="flex justify-between gap-3">
                    <span>
                      {formatDate(night.date)} · {night.weekend ? 'вихідна' : 'звичайна'}
                    </span>
                    <span className="tabular-nums">{formatMoneyAmount(night.price)}</span>
                  </li>
                ))}
              </ul>
              {previewNights.length > 21 ? <p className="text-xs text-muted-foreground">Показано перші 21 ніч.</p> : null}
            </div>
          ) : null}
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

const staySchema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву'),
  minNights: z.string(),
  discountValue: z.string().trim().regex(MONEY_RE, 'Відсоток з не більше ніж двома знаками після коми'),
  roomTypeIds: z.array(z.string()),
  active: z.enum(['yes', 'no']),
  previewCheckIn: z.string(),
  previewCheckOut: z.string(),
  previewSubtotal: z.string(),
})

function LengthStayDialog({
  open,
  item,
  canWrite,
  onOpenChange,
}: {
  open: boolean
  item?: LengthStayDiscount
  canWrite: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateAdminLengthStayDiscount()
  const update = useUpdateAdminLengthStayDiscount()
  const preview = usePreviewAdminLengthStay()
  const unitsQuery = useAdminRooms({ page: 1, limit: 100, active: true })
  const catalog = useMemo(
    () => (unitsQuery.data?.items ?? []).map((unit) => ({ id: unit.id, roomTypeId: unit.roomTypeId, title: unitDisplayTitle(unit) })),
    [unitsQuery.data?.items],
  )
  const pending = create.isPending || update.isPending
  const form = useForm<z.infer<typeof staySchema>>({
    resolver: zodResolver(staySchema),
    values: {
      name: item?.name ?? 'Знижка за тривале проживання',
      minNights: item ? String(item.minNights) : '6',
      discountValue: item?.discountValue ?? '10.00',
      roomTypeIds: item?.roomTypeIds ?? [],
      active: item?.active === false ? 'no' : 'yes',
      previewCheckIn: '',
      previewCheckOut: '',
      previewSubtotal: '',
    },
  })
  const selected = form.watch('roomTypeIds')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати знижку' : 'Нова знижка за тривалість'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            const minNights = parseStayNights(values.minNights)
            const discountValue = normalizeMoneyString(values.discountValue)
            if (minNights === null || minNights < 2 || !discountValue) {
              toast.error('Перевірте мінімум ночей і відсоток')
              return
            }
            try {
              const input = {
                name: values.name.trim(),
                minNights,
                discountValue,
                roomTypeIds: values.roomTypeIds,
                active: values.active === 'yes',
              }
              if (item) await update.mutateAsync({ id: item.id, input })
              else await create.mutateAsync(input)
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(pricingError(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Мінімум ночей" error={form.formState.errors.minNights?.message}>
              <Input inputMode="numeric" disabled={!canWrite} {...form.register('minNights')} />
            </Field>
            <Field label="Відсоток" error={form.formState.errors.discountValue?.message}>
              <Input inputMode="decimal" disabled={!canWrite} {...form.register('discountValue')} />
            </Field>
          </div>
          <Field label="Розміщення" hint={allCategoriesScopeCopy()}>
            <div className="max-h-40 space-y-2 overflow-auto rounded border border-border p-2">
              {catalog.map((unit) => (
                <label key={unit.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(unit.roomTypeId)}
                    disabled={!canWrite}
                    onCheckedChange={(checked) => {
                      const next = checked === true ? [...selected, unit.roomTypeId] : selected.filter((id) => id !== unit.roomTypeId)
                      form.setValue('roomTypeIds', [...new Set(next)])
                    }}
                  />
                  {unit.title}
                </label>
              ))}
            </div>
          </Field>
          {selected.map((typeId) => {
            const titles = catalog.filter((unit) => unit.roomTypeId === typeId).map((unit) => unit.title)
            return (
              <p key={typeId} className="text-sm text-muted-foreground">
                {titles.length > 1
                  ? `Ця знижка спільна для: ${titles.join(', ')}.`
                  : titles.length === 1
                    ? `Ця знижка стосується: ${titles[0]}.`
                    : 'Для цього типу ще немає розміщення в списку.'}
              </p>
            )
          })}
          <Field label="Стан">
            <Select value={form.watch('active')} onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)} disabled={!canWrite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активна</SelectItem>
                <SelectItem value="no">Вимкнена</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Перегляд: заїзд">
              <Input type="date" {...form.register('previewCheckIn')} />
            </Field>
            <Field label="Перегляд: виїзд">
              <Input type="date" {...form.register('previewCheckOut')} />
            </Field>
          </div>
          <Field label="Субсума проживання для перегляду, ₴">
            <Input inputMode="decimal" {...form.register('previewSubtotal')} />
          </Field>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const checkIn = form.getValues('previewCheckIn')
              const checkOut = form.getValues('previewCheckOut')
              const roomSubtotal = normalizeMoneyString(form.getValues('previewSubtotal'))
              if (!checkIn || !checkOut || !roomSubtotal) {
                toast.error('Вкажіть дати і субсуму для перегляду')
                return
              }
              try {
                const result = await preview.mutateAsync({
                  checkIn,
                  checkOut,
                  roomTypeIds: form.getValues('roomTypeIds'),
                  roomSubtotal,
                })
                toast.message(
                  result.ruleName
                    ? `${result.ruleName}: −${formatMoneyAmount(result.discountAmount)}, до сплати ${formatMoneyAmount(result.payable)}`
                    : `Без знижки, ${result.nights} ночей`,
                )
              } catch (error) {
                toast.error(pricingError(error))
              }
            }}
          >
            Переглянути розрахунок
          </Button>
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

function useNames(planIds: string[], typeIds: string[]) {
  const uniquePlans = useMemo(() => [...new Set(planIds)], [planIds])
  const uniqueTypes = useMemo(() => [...new Set(typeIds)], [typeIds])
  const planQueries = useQueries({
    queries: uniquePlans.map((id) => ({ queryKey: ['admin-rate-plan', id], queryFn: () => getRatePlan(id), enabled: Boolean(id) })),
  })
  const typeQueries = useQueries({
    queries: uniqueTypes.map((id) => ({ queryKey: ['admin-room-type', id], queryFn: () => getRoomType(id), enabled: Boolean(id) })),
  })
  return {
    plan: (id: string) => uniquePlans.map((value, index) => (value === id ? planQueries[index]?.data?.name : null)).find(Boolean) ?? '—',
    type: (id: string) => uniqueTypes.map((value, index) => (value === id ? typeQueries[index]?.data?.name : null)).find(Boolean) ?? '—',
  }
}

function weekendLabel(days: number[]) {
  const labels = WEEKDAYS.filter((day) => days.includes(day.id)).map((day) => day.label)
  return labels.join(', ') || '—'
}

function pricingError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Недостатньо прав для цієї дії'
    if (error.code === 'DAY_PRICE_RULE_CONFLICT') return 'Період перетинається з активним правилом цієї категорії'
    if (error.code === 'LENGTH_STAY_RULE_CONFLICT') return 'Активна знижка з таким мінімумом ночей уже покриває цю категорію'
    if (error.details?.length) return error.details.join('. ')
    if (error.message) return error.message
  }
  return errorMessage(error)
}
