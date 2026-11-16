import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { listAllRoomTypes } from '@/api/accommodations'
import { UnitMultiSelect } from '@/components/rates/UnitMultiSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useAllAdminRooms, useApplyPriceWorkspace, usePreviewPriceWorkspace } from '@/hooks/useHotel'
import { unitDisplayTitle } from '@/lib/accommodation-labels'
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

const WEEKDAY_FIELDS = [
  { id: 0, label: 'Понеділок' },
  { id: 1, label: 'Вівторок' },
  { id: 2, label: 'Середа' },
  { id: 3, label: 'Четвер' },
  { id: 4, label: 'Пʼятниця' },
  { id: 5, label: 'Субота' },
  { id: 6, label: 'Неділя' },
] as const

export function PriceWorkspace() {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  const rooms = useAllAdminRooms()
  const types = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const [preset, setPreset] = useState<PricePeriodPresetId>('current-month')
  const range = pricePeriodRange(preset)
  const [roomIds, setRoomIds] = useState<string[]>([])
  const [firstNight, setFirstNight] = useState(range.firstNight)
  const [lastNight, setLastNight] = useState(range.lastNight)
  const [price, setPrice] = useState('')
  const [byWeekday, setByWeekday] = useState(false)
  const [weekdayPrices, setWeekdayPrices] = useState(['', '', '', '', '', '', ''])
  const [preview, setPreview] = useState<PriceWorkspacePreview | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const previewMutation = usePreviewPriceWorkspace()
  const applyMutation = useApplyPriceWorkspace()

  const selectedUnits = useMemo(
    () => (rooms.data ?? []).filter((room) => roomIds.includes(room.id)),
    [rooms.data, roomIds],
  )
  const typeName = (roomTypeId: string) => types.data?.find((type) => type.id === roomTypeId)?.name
  const nightCount = inclusiveNightCount(firstNight, lastNight)

  function applyPreset(next: PricePeriodPresetId) {
    setPreset(next)
    const nextRange = pricePeriodRange(next)
    setFirstNight(nextRange.firstNight)
    setLastNight(nextRange.lastNight)
    setPreview(null)
  }

  function workspaceBody(replaceOverlaps = false, previewToken?: string) {
    const weekday = byWeekday ? weekdayPrices.map((value) => normalizeMoneyString(value) ?? '') : undefined
    return {
      roomIds,
      firstNight,
      lastNight,
      price: byWeekday ? undefined : (normalizeMoneyString(price) ?? ''),
      byWeekday,
      weekdayPrices: weekday,
      replaceOverlaps,
      previewToken,
    }
  }

  async function runPreview(): Promise<PriceWorkspacePreview | null> {
    if (!rooms.isSuccess || !types.isSuccess) {
      toast.error('Список розміщень завантажено не повністю. Збереження скасовано.')
      return null
    }
    if (roomIds.length === 0) {
      toast.error('Оберіть номер або будиночок')
      return null
    }
    if (nightCount < 1) {
      toast.error('Остання ніч має бути не раніше за першу')
      return null
    }
    const body = workspaceBody(false, preview?.previewToken)
    if (!byWeekday && !body.price) {
      toast.error('Вкажіть ціну за ніч у гривнях')
      return null
    }
    if (byWeekday && body.weekdayPrices?.some((value) => !value)) {
      toast.error('Вкажіть сім сум з понеділка по неділю')
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

  async function save(replaceOverlaps: boolean, previewToken = preview?.previewToken) {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    if (!previewToken) {
      toast.error('Спочатку перегляньте зміни')
      return
    }
    try {
      const result = await applyMutation.mutateAsync(workspaceBody(replaceOverlaps, previewToken))
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
        <h1 className="font-serif text-3xl font-medium">Ціни</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Ціна записується для обраних номерів і будиночків, у гривнях. Категорія типу більше не змінює сусідні
          одиниці. Уже створені бронювання зберігають записані нічні суми.
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

      <Field label="Номери та будиночки">
        <UnitMultiSelect
          rooms={rooms.data ?? []}
          roomTypes={types.data ?? []}
          value={roomIds}
          loading={rooms.isLoading || types.isLoading}
          error={rooms.isError || types.isError}
          onChange={(next) => {
            setRoomIds(next)
            setPreview(null)
          }}
        />
      </Field>

      {selectedUnits.length > 0 ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          Будуть змінені:{' '}
          {selectedUnits.map((unit) => unitDisplayTitle(unit, typeName(unit.roomTypeId))).join(', ')}.
        </p>
      ) : null}

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
        <Field label="Остання ніч" hint="Включно. Дата виїзду не тарифікується.">
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
        Окремі ціни з понеділка по неділю
      </label>

      {byWeekday ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {WEEKDAY_FIELDS.map((day) => (
            <Field key={day.id} label={`${day.label}, грн`}>
              <Input
                inputMode="decimal"
                value={weekdayPrices[day.id]}
                onChange={(event) => {
                  const next = [...weekdayPrices]
                  next[day.id] = event.target.value
                  setWeekdayPrices(next)
                  setPreview(null)
                }}
              />
            </Field>
          ))}
        </div>
      ) : (
        <Field label="Ціна (грн)" hint="Вкажіть одну ціну за кожну ніч періоду">
          <Input
            inputMode="decimal"
            value={price}
            onChange={(event) => {
              setPrice(event.target.value)
              setPreview(null)
            }}
          />
        </Field>
      )}

      {preview && !preview.needsReplace ? (
        <div className="space-y-2 text-sm">
          <p>
            {preview.nightCount} {nightsWord(preview.nightCount)} · без заміни наявних періодів для обраних одиниць.
          </p>
          <PreviewNights preview={preview} />
        </div>
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
                await save(false, preview.previewToken)
                return
              }
              if (preview?.needsReplace) {
                setConfirmReplace(true)
                return
              }
              const result = await runPreview()
              if (result && !result.needsReplace) await save(false, result.previewToken)
            })()
          }}
        >
          Зберегти
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        title="Замінити наявні ціни?"
        description={replaceCopy(preview)}
        confirmLabel="Замінити"
        pending={applyMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setConfirmReplace(false)
        }}
        onConfirm={() => {
          void save(true, preview?.previewToken)
        }}
      />
    </section>
  )
}

function PreviewNights({ preview }: { preview: PriceWorkspacePreview }) {
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {preview.units.map((unit) => (
        <li key={unit.roomId}>
          {unit.name ?? unit.number}:{' '}
          {unit.nights
            .slice(0, 7)
            .map(
              (night) =>
                `${formatDate(night.date)} ${night.oldPrice ? formatMoneyAmount(night.oldPrice) : '—'}/${formatMoneyAmount(night.newPrice)}`,
            )
            .join('; ')}
        </li>
      ))}
    </ul>
  )
}

function replaceCopy(preview: PriceWorkspacePreview | null) {
  if (!preview) return ''
  const units = preview.units.map((unit) => unit.name ?? unit.number).join(', ')
  const overlaps = preview.overlaps
    .map((row) => `${formatDate(row.startDate)} — ${formatDate(row.lastNight)} (${formatMoneyAmount(row.price)})`)
    .join('; ')
  return `Одиниці: ${units}. Перетин: ${overlaps || 'немає збережених цін одиниці'}. Нова ціна покриє ${preview.nightCount} ${nightsWord(preview.nightCount)}.`
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
    if (error.code === 'PRICE_PREVIEW_STALE') {
      return 'Каталог змінився після перегляду. Оновіть перегляд перед збереженням.'
    }
    if (error.code === 'RATE_PLAN_AMBIGUOUS') {
      return 'Кілька комерційних тарифів підходять. Ціни не записано.'
    }
    if (error.code === 'RATE_PLAN_TEST_ONLY' || error.code === 'RATE_PLAN_MISSING') {
      return error.message || 'Немає однозначного комерційного тарифу для запису цін.'
    }
    if (error.details?.length) return error.details.join('. ')
    if (error.message) return error.message
  }
  return errorMessage(error)
}
