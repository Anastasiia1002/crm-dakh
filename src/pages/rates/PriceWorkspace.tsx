import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { listAllRoomTypes } from '@/api/accommodations'
import { AccommodationSelectGroups } from '@/components/bookings/AccommodationSelectGroups'
import { RatePlanPicker } from '@/components/rates/RatePlanPicker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminRatePlans,
  useAllAdminRooms,
  useApplyPriceWorkspace,
  usePreviewPriceWorkspace,
} from '@/hooks/useHotel'
import { unitDisplayTitle } from '@/lib/accommodation-labels'
import { pickDefaultCommercialRatePlan } from '@/lib/default-rate-plan'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoneyAmount, normalizeMoneyString } from '@/lib/format'
import {
  inclusiveNightCount,
  PRICE_PERIOD_PRESETS,
  pricePeriodRange,
  type PricePeriodPresetId,
} from '@/lib/price-nights'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import { canManageRates } from '@/lib/roles'
import type { PriceWorkspacePreview } from '@/types'

export function PriceWorkspace() {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  const rooms = useAllAdminRooms()
  const types = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const plansQuery = useAdminRatePlans({ page: 1, limit: 100, active: true })
  const choice = useMemo(
    () => pickDefaultCommercialRatePlan(plansQuery.data?.items ?? []),
    [plansQuery.data?.items],
  )
  const [preset, setPreset] = useState<PricePeriodPresetId>('current-month')
  const range = pricePeriodRange(preset)
  const [unitId, setUnitId] = useState('')
  const [ratePlanId, setRatePlanId] = useState('')
  const [firstNight, setFirstNight] = useState(range.firstNight)
  const [lastNight, setLastNight] = useState(range.lastNight)
  const [price, setPrice] = useState('')
  const [byWeekday, setByWeekday] = useState(false)
  const [weekdayPrice, setWeekdayPrice] = useState('')
  const [weekendPrice, setWeekendPrice] = useState('')
  const [preview, setPreview] = useState<PriceWorkspacePreview | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const previewMutation = usePreviewPriceWorkspace()
  const applyMutation = useApplyPriceWorkspace()

  const selectedUnit = (rooms.data ?? []).find((room) => room.id === unitId)
  const roomTypeId = selectedUnit?.roomTypeId ?? ''
  const typeName = types.data?.find((type) => type.id === roomTypeId)?.name
  const affectedUnits = (rooms.data ?? []).filter((room) => room.roomTypeId === roomTypeId)
  const nightCount = inclusiveNightCount(firstNight, lastNight)
  const resolvedPlanId = ratePlanId || (choice.mode === 'auto' ? choice.plan.id : '')
  const resolvedPlan =
    (plansQuery.data?.items ?? []).find((plan) => plan.id === resolvedPlanId) ??
    (choice.mode === 'auto' && choice.plan.id === resolvedPlanId ? choice.plan : undefined)

  function applyPreset(next: PricePeriodPresetId) {
    setPreset(next)
    const nextRange = pricePeriodRange(next)
    setFirstNight(nextRange.firstNight)
    setLastNight(nextRange.lastNight)
    setPreview(null)
  }

  function workspaceBody(replaceOverlaps = false) {
    const catalogPrice = normalizeMoneyString(byWeekday ? weekdayPrice || price : price)
    const weekday = byWeekday ? normalizeMoneyString(weekdayPrice) : null
    const weekend = byWeekday ? normalizeMoneyString(weekendPrice) : null
    return {
      ratePlanId: resolvedPlanId,
      roomTypeId,
      firstNight,
      lastNight,
      price: catalogPrice ?? '',
      byWeekday,
      weekdayPrice: weekday ?? undefined,
      weekendPrice: weekend ?? undefined,
      weekendDays: byWeekday ? [5, 6] : undefined,
      replaceOverlaps,
    }
  }

  async function runPreview(): Promise<PriceWorkspacePreview | null> {
    if (!rooms.isSuccess || !types.isSuccess) {
      toast.error('Список розміщень завантажено не повністю. Збереження скасовано.')
      return null
    }
    if (!roomTypeId) {
      toast.error('Оберіть номер або будиночок')
      return null
    }
    if (!resolvedPlanId) {
      toast.error('Оберіть тариф, який редагується')
      return null
    }
    if (choice.mode === 'choose' && choice.reason === 'test-only' && !ratePlanId) {
      toast.error('Тестовий тариф не підставляється для публічних цін. Оберіть комерційний тариф.')
      return null
    }
    if (nightCount < 1) {
      toast.error('Остання ніч має бути не раніше за першу')
      return null
    }
    const body = workspaceBody(false)
    if (!body.price || (byWeekday && (!body.weekdayPrice || !body.weekendPrice))) {
      toast.error('Вкажіть ціну за ніч у гривнях')
      return null
    }
    try {
      const result = await previewMutation.mutateAsync(body)
      setPreview(result)
      if (result.needsReplace) setConfirmReplace(true)
      return result
    } catch (error) {
      toast.error(workspaceError(error))
      return null
    }
  }

  async function save(replaceOverlaps: boolean) {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    try {
      const result = await applyMutation.mutateAsync(workspaceBody(replaceOverlaps))
      setPreview(result)
      setConfirmReplace(false)
      toast.success(`Збережено ${result.nightCount} ${nightsWord(result.nightCount)}`)
    } catch (error) {
      toast.error(workspaceError(error))
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium">Встановлення цін</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Тут ви можете встановити ціни, які в майбутньому зможете корегувати. Ціна застосовується до категорії
          розміщення, у гривнях. Уже створені бронювання зберігають записані нічні суми.
        </p>
      </div>

      <Field label="Оберіть період на який встановлюємо ціни">
        <Select value={preset} onValueChange={(value: PricePeriodPresetId) => applyPreset(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRICE_PERIOD_PRESETS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Номер або будиночок">
        <Select
          value={unitId || undefined}
          onValueChange={(value) => {
            setUnitId(value)
            setPreview(null)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Оберіть номер або будиночок" />
          </SelectTrigger>
          <SelectContent>
            <AccommodationSelectGroups rooms={rooms.data ?? []} roomTypes={types.data ?? []} />
          </SelectContent>
        </Select>
        {rooms.isError || types.isError ? (
          <p className="mt-1 text-xs text-destructive">Не вдалося завантажити повний список розміщень.</p>
        ) : null}
      </Field>

      {roomTypeId ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          Ціна застосовується до категорії «{typeName ?? '—'}». Будуть змінені:{' '}
          {affectedUnits.map((unit) => unitDisplayTitle(unit, typeName)).join(', ') || 'фізичних одиниць ще немає'}.
        </p>
      ) : null}

      <Field
        label="Тариф"
        hint={
          choice.mode === 'auto'
            ? 'Підставлено єдиний активний комерційний стандартний тариф. Тестові коди не використовуються.'
            : choice.reason === 'test-only'
              ? 'Є лише тестові тарифи. Для публічних цін оберіть комерційний тариф явно.'
              : choice.reason === 'none'
                ? 'Немає активного комерційного тарифу. Створіть його в блоці тарифних планів нижче.'
                : 'Кілька тарифів підходять. Оберіть, який саме редагується.'
        }
      >
        {choice.mode === 'auto' && !ratePlanId ? (
          <p className="text-sm">
            Редагується тариф {choice.plan.name} ({choice.plan.code}).{' '}
            <button type="button" className="underline underline-offset-4" onClick={() => setRatePlanId(choice.plan.id)}>
              Змінити
            </button>
          </p>
        ) : (
          <RatePlanPicker
            value={resolvedPlanId}
            activeOnly
            placeholder="Оберіть тариф"
            onChange={(value) => {
              setRatePlanId(value)
              setPreview(null)
            }}
          />
        )}
        {resolvedPlan ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Зміни підуть у тариф {resolvedPlan.name} ({resolvedPlan.code}
            {resolvedPlan.publicOfferable ? ', можна пропонувати на сайті' : ', лише в адмінці'}).
          </p>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Перша ніч">
          <Input
            type="date"
            value={firstNight}
            onChange={(event) => {
              setFirstNight(event.target.value)
              setPreview(null)
            }}
          />
        </Field>
        <Field label="Остання ніч" hint="Включно. На сервері зберігається як дата кінця, яка вже не входить.">
          <Input
            type="date"
            value={lastNight}
            onChange={(event) => {
              setLastNight(event.target.value)
              setPreview(null)
            }}
          />
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">
        {nightCount > 0 ? `Буде змінено ${nightCount} ${nightsWord(nightCount)}.` : 'Вкажіть включні дати ночей.'}
      </p>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={byWeekday}
          onCheckedChange={(value) => {
            setByWeekday(value === true)
            setPreview(null)
          }}
        />
        Ціна залежить від дня тижня
      </label>
      {byWeekday ? (
        <p className="text-xs text-muted-foreground">
          У DAKH це накладка будень/вихідні на ціну категорії, а не сім окремих сум як у BookMeNow.
        </p>
      ) : null}

      {byWeekday ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Будні, грн">
            <Input inputMode="decimal" value={weekdayPrice} onChange={(event) => setWeekdayPrice(event.target.value)} />
          </Field>
          <Field label="Вихідні, грн">
            <Input inputMode="decimal" value={weekendPrice} onChange={(event) => setWeekendPrice(event.target.value)} />
          </Field>
        </div>
      ) : (
        <Field label="Ціна (грн)" hint="Вкажіть ціну за ніч">
          <Input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
        </Field>
      )}

      {preview && !preview.needsReplace ? (
        <p className="text-sm">
          {preview.nightCount} {nightsWord(preview.nightCount)} · {formatMoneyAmount(preview.price)} · без заміни
          наявних періодів.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void runPreview()} disabled={previewMutation.isPending}>
          Переглянути
        </Button>
        <Button
          type="button"
          disabled={!canWrite || applyMutation.isPending || previewMutation.isPending}
          onClick={() => {
            void (async () => {
              if (preview && !preview.needsReplace) {
                await save(false)
                return
              }
              if (preview?.needsReplace) {
                setConfirmReplace(true)
                return
              }
              const result = await runPreview()
              if (result && !result.needsReplace) await save(false)
            })()
          }}
        >
          Зберегти
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        title="Замінити наявні ціни?"
        description={
          preview?.overlaps.length
            ? `Перетин на ${preview.overlaps
                .map(
                  (row) =>
                    `${formatDate(row.startDate)} — ${formatDate(row.lastNight)} (${formatMoneyAmount(row.price)})`,
                )
                .join('; ')}. Нова ціна покриє ${preview.nightCount} ${nightsWord(preview.nightCount)}.`
            : ''
        }
        confirmLabel="Замінити"
        pending={applyMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setConfirmReplace(false)
        }}
        onConfirm={() => {
          void save(true)
        }}
      />
    </section>
  )
}

function nightsWord(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'ніч'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ночі'
  return 'ночей'
}

function workspaceError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Недостатньо прав для цієї дії'
    if (error.code === 'ROOM_PRICE_OVERLAP') {
      return 'Період перетинається з наявною ціною. Перегляньте дати перед заміною.'
    }
    if (error.details?.length) return error.details.join('. ')
    if (error.message) return error.message
  }
  return errorMessage(error)
}
