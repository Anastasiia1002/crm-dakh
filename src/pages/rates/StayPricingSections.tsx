import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getRoomType, listAllRoomTypes } from '@/api/accommodations'
import { getRatePlan } from '@/api/rates'
import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ScrollableFormDialog, formDialogGridClass, formDialogSelectContentClass } from '@/components/pricing/ScrollableFormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { MobileCard, MobileCardBadges, MobileCardDetail, MobileCardDetails, MobileCardHeader, MobileList } from '@/components/ui/mobile-list'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminDayPriceRules,
  useAdminLengthStayDiscounts,
  useAdminRatePlans,
  useAllAdminRooms,
  useCreateAdminDayPriceRule,
  useCreateAdminLengthStayDiscount,
  useDeleteAdminDayPriceRule,
  useDeleteAdminLengthStayDiscount,
  usePreviewAdminDayPrice,
  usePreviewAdminLengthStay,
  useUpdateAdminDayPriceRule,
  useUpdateAdminLengthStayDiscount,
} from '@/hooks/useHotel'
import { unitDisplayTitle } from '@/lib/accommodation-labels'
import { ApiError } from '@/lib/api-error'
import { resolvedCommercialRatePlanId } from '@/lib/default-rate-plan'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoneyAmount, normalizeMoneyString, parseStayNights } from '@/lib/format'
import { exclusiveEndFromLastNight, lastNightFromExclusiveEnd } from '@/lib/price-nights'
import {
  categoryScopeCopy,
  categoryUnitCount,
  dayPriceSaveAllowed,
  kindsFromLengthStayRoomTypes,
  lengthStayKindLabel,
  lengthStayNightWindowWritable,
  lengthStayRoomTypeIdsForSave,
  lengthStayRuleSummary,
  lengthStayScopeCopy,
  lengthStayWindowCopy,
  lengthStayWritePayload,
  storedLengthStayWindow,
  roomTypeIdsForLengthStayKinds,
  roomTypeIdsForUnits,
  unselectedUnitsSharingType,
  type LengthStayKind,
} from '@/lib/pricing-scope'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import { canManageRates } from '@/lib/roles'
import type { DayPricePreview, DayPriceRule, LengthStayDiscount, RatePlan } from '@/types'

function useUnitCatalog(units: { id: string; roomTypeId: string; name: string | null; number: string }[] | undefined) {
  const typesQuery = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  return useMemo(() => {
    const names = new Map((typesQuery.data ?? []).map((type) => [type.id, type.name]))
    return (units ?? []).map((unit) => ({
      id: unit.id,
      roomTypeId: unit.roomTypeId,
      title: unitDisplayTitle(unit, names.get(unit.roomTypeId)),
    }))
  }, [typesQuery.data, units])
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

export function LengthStayDiscountsPanel() {
  const { user } = useAuth()
  return <LengthStaySection canWrite={canManageRates(user?.role)} />
}

function DayPriceSection({ canWrite }: { canWrite: boolean }) {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<DayPriceRule | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DayPriceRule | null>(null)
  const query = useAdminDayPriceRules({ page, limit: PAGE_SIZE })
  const unitsQuery = useAllAdminRooms()
  const remove = useDeleteAdminDayPriceRule()
  const items = query.data?.items ?? []
  const units = unitsQuery.data ?? []
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
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>Розміщення</TableHead>
              <TableHead>Будень</TableHead>
              <TableHead>Вихідні</TableHead>
              <TableHead>Дні вихідних</TableHead>
              <TableHead>Період</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead stickyActions>
                <span className="sr-only">Дії</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{names.plan(rule.ratePlanId)}</TableCell>
                <TableCell>
                  <p>{names.type(rule.roomTypeId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {unitsQuery.isSuccess
                      ? categoryScopeCopy(categoryUnitCount(units, rule.roomTypeId))
                      : unitsQuery.isError
                        ? 'Не вдалося порахувати розміщення.'
                        : 'Завантаження розміщень…'}
                  </p>
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
                <TableCell stickyActions className="text-right">
                  {canWrite ? (
                    <ActionsMenu label={`Дії для правила ${rule.name}`}>
                      <DropdownMenuItem onSelect={() => setEditing(rule)}>Редагувати</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setPendingDelete(rule)}
                      >
                        Видалити
                      </DropdownMenuItem>
                    </ActionsMenu>
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
  const typesQuery = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const remove = useDeleteAdminLengthStayDiscount()
  const items = query.data?.items ?? []
  const types = typesQuery.data ?? []

  return (
    <section>
      <SectionHeading
        title="Знижки за тривалість проживання"
        action={canWrite ? <Button onClick={() => setEditing('new')}>Додати знижку</Button> : undefined}
      />
      {query.isLoading && !query.data ? <LoadingState /> : null}
      {query.isError ? <p className="text-sm text-destructive">Не вдалося завантажити знижки</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <div className="space-y-3 py-8">
          <EmptyState>Знижок ще немає</EmptyState>
          <p className="text-sm text-muted-foreground">Додайте знижку за тривалість проживання.</p>
          {canWrite ? <Button onClick={() => setEditing('new')}>Додати знижку</Button> : null}
        </div>
      ) : null}
      {!query.isError && items.length > 0 ? (
        <>
        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Мінімум ночей</TableHead>
              <TableHead>Відсоток</TableHead>
              <TableHead>Охоплення</TableHead>
              <TableHead>Вікно ночей</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead stickyActions>
                <span className="sr-only">Дії</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((rule) => {
              const kinds = kindsFromLengthStayRoomTypes(types, rule.roomTypeIds)
              const window = storedLengthStayWindow(rule)
              return (
              <TableRow key={rule.id}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{rule.minNights}</TableCell>
                <TableCell>{formatLengthStayPercent(rule.discountValue)}</TableCell>
                <TableCell>{lengthStayScopeCopy(kinds)}</TableCell>
                <TableCell>{lengthStayWindowCopy(window)}</TableCell>
                <TableCell>
                  <Badge tone={rule.active ? 'success' : 'neutral'}>{rule.active ? 'Активна' : 'Вимкнена'}</Badge>
                </TableCell>
                <TableCell stickyActions className="text-right">
                  {canWrite ? (
                    <ActionsMenu label={`Дії для знижки ${rule.name}`}>
                      <DropdownMenuItem onSelect={() => setEditing(rule)}>Редагувати</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setPendingDelete(rule)}
                      >
                        Видалити
                      </DropdownMenuItem>
                    </ActionsMenu>
                  ) : (
                    <span className="text-xs text-muted-foreground">Лише перегляд</span>
                  )}
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
        <MobileList>
          {items.map((rule) => {
            const kinds = kindsFromLengthStayRoomTypes(types, rule.roomTypeIds)
            const window = storedLengthStayWindow(rule)
            return (
              <MobileCard key={rule.id}>
                <MobileCardHeader
                  title={rule.name}
                  actions={
                    canWrite ? (
                      <ActionsMenu label={`Дії для знижки ${rule.name}`}>
                        <DropdownMenuItem onSelect={() => setEditing(rule)}>Редагувати</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setPendingDelete(rule)}
                        >
                          Видалити
                        </DropdownMenuItem>
                      </ActionsMenu>
                    ) : undefined
                  }
                />
                <MobileCardBadges>
                  <Badge tone={rule.active ? 'success' : 'neutral'}>{rule.active ? 'Активна' : 'Вимкнена'}</Badge>
                </MobileCardBadges>
                <MobileCardDetails>
                  <MobileCardDetail label="Мінімум ночей">{rule.minNights}</MobileCardDetail>
                  <MobileCardDetail label="Відсоток">{formatLengthStayPercent(rule.discountValue)}</MobileCardDetail>
                  <MobileCardDetail label="Охоплення">{lengthStayScopeCopy(kinds)}</MobileCardDetail>
                  <MobileCardDetail label="Вікно ночей">{lengthStayWindowCopy(window)}</MobileCardDetail>
                </MobileCardDetails>
              </MobileCard>
            )
          })}
        </MobileList>
        </>
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

const MISSING_COMMERCIAL_STANDARD = 'Немає однозначних умов STANDARD для цього розміщення.'

function commercialRatePlanId(plans: readonly RatePlan[] | undefined) {
  return resolvedCommercialRatePlanId(plans ?? [])
}

const daySchema = z
  .object({
    seasonName: z.string().trim().min(1, 'Вкажіть назву сезону').max(80, 'Назва до 80 символів'),
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
  const unitsQuery = useAllAdminRooms({ active: true })
  const plansQuery = useAdminRatePlans({ active: true, page: 1, limit: 100 })
  const catalogReady = unitsQuery.isSuccess
  const plansReady = item ? true : plansQuery.isSuccess
  const ratePlanId = item?.ratePlanId ?? commercialRatePlanId(plansQuery.data?.items)
  const pending = create.isPending || update.isPending
  const [previewNights, setPreviewNights] = useState<DayPricePreview['nights']>([])
  const [previewTotal, setPreviewTotal] = useState<string | null>(null)
  const catalog = useUnitCatalog(catalogReady ? unitsQuery.data : undefined)
  const initialUnits = item ? catalog.filter((unit) => unit.roomTypeId === item.roomTypeId).map((unit) => unit.id) : []
  const form = useForm<z.infer<typeof daySchema>>({
    resolver: zodResolver(daySchema),
    values: {
      seasonName: item?.name ?? 'Зимовий сезон 2026–2027',
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
      <ScrollableFormDialog
        title={item ? 'Редагувати сезон' : 'Новий сезон'}
        onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            if (!dayPriceSaveAllowed(catalogReady) || !plansReady) {
              toast.error('Список розміщень завантажено не повністю. Збереження скасовано.')
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
                weekdayPrice,
                weekendPrice,
                weekendDays: values.weekendDays,
                startDate: values.startDate,
                endDate: values.endDate,
                active: values.active === 'yes',
              }
              if (item) await update.mutateAsync({ id: item.id, input: { ...base, roomTypeId: item.roomTypeId } })
              else {
                if (!ratePlanId) {
                  toast.error(MISSING_COMMERCIAL_STANDARD)
                  return
                }
                for (const roomTypeId of selectedTypes) {
                  await create.mutateAsync({ ...base, ratePlanId, roomTypeId })
                }
              }
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(pricingError(error))
            }
          })}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={!canWrite || pending || !catalogReady || !plansReady} loading={pending}>
                Зберегти
              </Button>
            </>
          }
        >
          {unitsQuery.isError ? (
            <p className="text-sm text-destructive">Не вдалося завантажити повний список розміщень. Збереження вимкнено.</p>
          ) : null}
          {!item && plansQuery.isError ? (
            <p className="text-sm text-destructive">Не вдалося визначити умови STANDARD. Збереження вимкнено.</p>
          ) : null}
          {!item && plansReady && !ratePlanId ? (
            <p className="text-sm text-destructive">{MISSING_COMMERCIAL_STANDARD}</p>
          ) : null}
          <Field label="Назва сезону" hint="Зберігається і показується в списку. Наприклад, «Зимовий сезон 2026–2027»." error={form.formState.errors.seasonName?.message}>
            <Input disabled={!canWrite} {...form.register('seasonName')} />
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
          <div className={formDialogGridClass}>
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
          <Field
            label="Ночі сезону"
            hint="Перший клік — перша ніч, другий — остання. Дата виїзду не тарифікується."
            error={form.formState.errors.startDate?.message || form.formState.errors.endDate?.message}
          >
            <DateRangePicker
              start={form.watch('startDate')}
              end={form.watch('endDate') ? lastNightFromExclusiveEnd(form.watch('endDate')) : ''}
              allowPast
              disabled={!canWrite}
              onChange={({ start, end }) => {
                form.setValue('startDate', start, { shouldValidate: true })
                if (end) form.setValue('endDate', exclusiveEndFromLastNight(end), { shouldValidate: true })
              }}
            />
          </Field>
          <Field label="Стан">
            <Select value={form.watch('active')} onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)} disabled={!canWrite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={formDialogSelectContentClass} collisionPadding={16}>
                <SelectItem value="yes">Активне</SelectItem>
                <SelectItem value="no">Вимкнене</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={typeIds.length === 0 || !ratePlanId || !form.watch('startDate') || !form.watch('endDate')}
            onClick={async () => {
              const weekdayPrice = normalizeMoneyString(form.getValues('weekdayPrice'))
              const weekendPrice = normalizeMoneyString(form.getValues('weekendPrice'))
              if (!weekdayPrice || !weekendPrice) {
                toast.error('Вкажіть обидві ціни перед переглядом')
                return
              }
              if (!ratePlanId) {
                toast.error(MISSING_COMMERCIAL_STANDARD)
                return
              }
              try {
                const result = await preview.mutateAsync({
                  ratePlanId,
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
      </ScrollableFormDialog>
    </Dialog>
  )
}

const staySchema = z
  .object({
    name: z.string().trim().min(1, 'Вкажіть назву'),
    minNights: z.string(),
    discountValue: z.string().trim().regex(MONEY_RE, 'Відсоток з не більше ніж двома знаками після коми'),
    kinds: z.array(z.enum(['ROOM', 'COTTAGE'])).min(1, 'Оберіть Номери або Будиночки'),
    nightFrom: z.string(),
    nightToExclusive: z.string(),
    active: z.enum(['yes', 'no']),
    previewCheckIn: z.string(),
    previewCheckOut: z.string(),
    previewSubtotal: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.nightFrom && !DATE_RE.test(values.nightFrom)) {
      ctx.addIssue({ code: 'custom', path: ['nightFrom'], message: 'Дата у форматі РРРР-ММ-ДД' })
    }
    if (values.nightToExclusive && !DATE_RE.test(values.nightToExclusive)) {
      ctx.addIssue({ code: 'custom', path: ['nightToExclusive'], message: 'Дата у форматі РРРР-ММ-ДД' })
    }
    if (values.nightFrom && values.nightToExclusive && values.nightToExclusive <= values.nightFrom) {
      ctx.addIssue({ code: 'custom', path: ['nightToExclusive'], message: 'Кінець вікна має бути пізніше за першу ніч' })
    }
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
  const unitsQuery = useAllAdminRooms({ active: true })
  const typesQuery = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const catalogReady = unitsQuery.isSuccess && typesQuery.isSuccess
  const types = typesQuery.data ?? []
  const nightWindowWritable = lengthStayNightWindowWritable()
  const storedWindow = storedLengthStayWindow(item)
  const pending = create.isPending || update.isPending
  const form = useForm<z.infer<typeof staySchema>>({
    resolver: zodResolver(staySchema),
    values: {
      name: item?.name ?? 'Знижка за тривале проживання',
      minNights: item ? String(item.minNights) : '3',
      discountValue: item?.discountValue ?? '10.00',
      kinds: item ? kindsFromLengthStayRoomTypes(types, item.roomTypeIds) : ['ROOM', 'COTTAGE'],
      nightFrom: lengthStayNightWindowWritable() ? storedLengthStayWindow(item).nightFrom ?? '' : '',
      nightToExclusive: lengthStayNightWindowWritable()
        ? storedLengthStayWindow(item).nightToExclusive ?? ''
        : '',
      active: item ? (item.active === false ? 'no' : 'yes') : 'no',
      previewCheckIn: '',
      previewCheckOut: '',
      previewSubtotal: '',
    },
  })
  const selectedKinds = form.watch('kinds')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableFormDialog
        title={item ? 'Редагувати знижку' : 'Нова знижка за тривалість'}
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
            const roomTypeIds = lengthStayRoomTypeIdsForSave({
              catalogComplete: catalogReady,
              roomTypeIds: roomTypeIdsForLengthStayKinds(types, values.kinds),
            })
            if (roomTypeIds === null) {
              toast.error('Список розміщень завантажено не повністю. Збереження скасовано.')
              return
            }
            try {
              const input = lengthStayWritePayload({
                name: values.name.trim(),
                minNights,
                discountValue,
                roomTypeIds,
                active: values.active === 'yes',
                nightFrom: values.nightFrom || null,
                nightToExclusive: values.nightToExclusive || null,
                nightWindowWritable,
              })
              if (item) await update.mutateAsync({ id: item.id, input })
              else await create.mutateAsync(input)
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(pricingError(error))
            }
          })}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={!canWrite || pending || !catalogReady} loading={pending}>
                Зберегти
              </Button>
            </>
          }
        >
          {unitsQuery.isError || typesQuery.isError ? (
            <p className="text-sm text-destructive">Не вдалося завантажити повний список розміщень. Збереження вимкнено.</p>
          ) : null}
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <div className={formDialogGridClass}>
            <Field label="Мінімум ночей" error={form.formState.errors.minNights?.message}>
              <Input inputMode="numeric" disabled={!canWrite} {...form.register('minNights')} />
            </Field>
            <Field label="Відсоток" error={form.formState.errors.discountValue?.message}>
              <Input inputMode="decimal" disabled={!canWrite} {...form.register('discountValue')} />
            </Field>
          </div>
          <Field label="Для кого" hint="Лише групи Номери / Будиночки. Окремої одиниці немає." error={form.formState.errors.kinds?.message}>
            <div className="space-y-2 rounded border border-border p-2">
              {(['ROOM', 'COTTAGE'] as const).map((kind) => (
                <label key={kind} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedKinds.includes(kind)}
                    disabled={!canWrite}
                    onCheckedChange={(checked) => {
                      const next =
                        checked === true ? [...selectedKinds, kind] : selectedKinds.filter((value) => value !== kind)
                      form.setValue('kinds', next as LengthStayKind[], { shouldValidate: true })
                    }}
                  />
                  {lengthStayKindLabel(kind)}
                </label>
              ))}
            </div>
          </Field>
          <p className="text-sm text-muted-foreground">
            {lengthStayRuleSummary({
              minNights: parseStayNights(form.watch('minNights')) ?? 0,
              discountValue: form.watch('discountValue') || '0',
              kinds: selectedKinds,
              active: form.watch('active') === 'yes',
              nightFrom: storedWindow.nightFrom || (nightWindowWritable ? form.watch('nightFrom') || null : null),
              nightToExclusive:
                storedWindow.nightToExclusive || (nightWindowWritable ? form.watch('nightToExclusive') || null : null),
            })}
          </p>
          <Field
            label="Вікно ночей (необовʼязково)"
            hint={
              nightWindowWritable
                ? 'Перший клік — перша тарифікована ніч, другий — остання. Дата виїзду не входить. Усі ночі проживання мають лежати в цьому вікні.'
                : 'Вікно ночей у цьому середовищі лише для перегляду. Збереження не надсилає дати і не стирає вже записане вікно.'
            }
            error={form.formState.errors.nightFrom?.message || form.formState.errors.nightToExclusive?.message}
          >
            {storedWindow.nightFrom || storedWindow.nightToExclusive ? (
              <p className="text-sm">
                Записане вікно збережено
                {storedWindow.nightFrom ? ` з ${storedWindow.nightFrom}` : ''}
                {storedWindow.nightToExclusive ? ` до ${storedWindow.nightToExclusive}` : ''}
                {nightWindowWritable ? '.' : ' і не буде стерте цим збереженням.'}
              </p>
            ) : null}
            <DateRangePicker
              start={nightWindowWritable ? form.watch('nightFrom') : storedWindow.nightFrom ?? ''}
              end={
                nightWindowWritable
                  ? form.watch('nightToExclusive')
                    ? lastNightFromExclusiveEnd(form.watch('nightToExclusive'))
                    : ''
                  : storedWindow.nightToExclusive
                    ? lastNightFromExclusiveEnd(storedWindow.nightToExclusive)
                    : ''
              }
              allowPast
              disabled={!canWrite || !nightWindowWritable}
              onChange={({ start, end }) => {
                if (!nightWindowWritable) return
                form.setValue('nightFrom', start, { shouldValidate: true })
                if (end) form.setValue('nightToExclusive', exclusiveEndFromLastNight(end), { shouldValidate: true })
                if (!start && !end) {
                  form.setValue('nightFrom', '', { shouldValidate: true })
                  form.setValue('nightToExclusive', '', { shouldValidate: true })
                }
              }}
            />
          </Field>
          <Field label="Стан">
            <Select value={form.watch('active')} onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)} disabled={!canWrite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={formDialogSelectContentClass} collisionPadding={16}>
                <SelectItem value="yes">Активна</SelectItem>
                <SelectItem value="no">Вимкнена</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Перегляд проживання">
            <DateRangePicker
              start={form.watch('previewCheckIn')}
              end={form.watch('previewCheckOut') ? lastNightFromExclusiveEnd(form.watch('previewCheckOut')) : ''}
              allowPast
              onChange={({ start, end }) => {
                form.setValue('previewCheckIn', start)
                if (end) form.setValue('previewCheckOut', exclusiveEndFromLastNight(end))
              }}
            />
          </Field>
          <Field
            label="Приклад суми проживання, ₴"
            hint="Лише щоб перевірити знижку. У бронювання не записується."
          >
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
                toast.error('Вкажіть дати і приклад суми для перегляду')
                return
              }
              const roomTypeIds = lengthStayRoomTypeIdsForSave({
                catalogComplete: catalogReady,
                roomTypeIds: roomTypeIdsForLengthStayKinds(types, form.getValues('kinds')),
              })
              if (roomTypeIds === null) {
                toast.error('Список розміщень завантажено не повністю.')
                return
              }
              try {
                const result = await preview.mutateAsync({
                  checkIn,
                  checkOut,
                  roomTypeIds,
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
      </ScrollableFormDialog>
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

function formatLengthStayPercent(value: string) {
  return `${value.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`
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
