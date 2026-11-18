import { useMemo } from 'react'
import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentPricesCalendar } from '@/hooks/useHotel'
import { unitDisplayTitle } from '@/lib/accommodation-labels'
import { CURRENT_PRICE_LABEL, CURRENT_PRICES_MAX_NIGHTS } from '@/lib/current-prices'
import { errorMessage } from '@/lib/errors'
import { formatDateShort, formatMoneyAmount, formatWeekday } from '@/lib/format'
import { inclusiveNightCount, PRICE_PERIOD_PRESETS, pricePeriodRange, type PricePeriodPresetId } from '@/lib/price-nights'
import { canManageRates } from '@/lib/roles'
import type { CurrentPriceNight } from '@/types'

const CALENDAR_PRESETS = PRICE_PERIOD_PRESETS.filter((item) => item.id !== 'current-year')

function PriceCell({ night }: { night: CurrentPriceNight }) {
  if (night.missing || !night.amount) {
    return <span className="text-muted-foreground">{CURRENT_PRICE_LABEL.missing}</span>
  }
  return <p className="font-medium tabular-nums">{formatMoneyAmount(night.amount)}</p>
}

export function CurrentPricesCalendar({
  firstNight,
  lastNight,
  preset,
  highlightedRoomIds = [],
  onRangeChange,
  onEditPrices,
}: {
  firstNight: string
  lastNight: string
  preset: PricePeriodPresetId
  highlightedRoomIds?: string[]
  onRangeChange: (next: { preset: PricePeriodPresetId; firstNight: string; lastNight: string }) => void
  onEditPrices: () => void
}) {
  const { user } = useAuth()
  const canWrite = canManageRates(user?.role)
  const nightCount = inclusiveNightCount(firstNight, lastNight)
  const rangeOk = nightCount > 0 && nightCount <= CURRENT_PRICES_MAX_NIGHTS
  const calendar = useCurrentPricesCalendar(rangeOk ? { firstNight, lastNight } : undefined)

  function applyPreset(next: PricePeriodPresetId) {
    const range = pricePeriodRange(next)
    onRangeChange({ preset: next, firstNight: range.firstNight, lastNight: range.lastNight })
  }

  const groups = calendar.data?.groups ?? []
  const nights = calendar.data?.nights ?? []
  const empty = useMemo(() => groups.every((group) => group.units.length === 0), [groups])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-medium">Ціни</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Тут видно діючі ціни по номерах і будиночках. Щоб змінити їх — «Змінити ціни».
          </p>
        </div>
        {canWrite ? (
          <Button type="button" onClick={onEditPrices}>
            Змінити ціни
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Шаблон">
          <Select value={preset} onValueChange={(value: PricePeriodPresetId) => applyPreset(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALENDAR_PRESETS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Період">
          <DateRangePicker
            start={firstNight}
            end={lastNight}
            allowPast
            onChange={({ start, end }) => {
              onRangeChange({
                preset: 'current-month',
                firstNight: start,
                lastNight: end || lastNight,
              })
            }}
          />
        </Field>
      </div>

      {!rangeOk ? (
        <p className="text-sm text-destructive">
          {nightCount <= 0
            ? 'Оберіть період, де остання ніч не раніше за першу.'
            : `Показуйте не більше ніж ${CURRENT_PRICES_MAX_NIGHTS} ночей.`}
        </p>
      ) : null}

      {calendar.isLoading && !calendar.data ? <LoadingState /> : null}
      {calendar.isError ? (
        <p className="text-sm text-destructive">{errorMessage(calendar.error)}</p>
      ) : null}
      {calendar.data && empty ? <EmptyState>Немає номерів і будиночків</EmptyState> : null}

      {calendar.data && !empty
        ? groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <h2 className="font-serif text-xl font-medium">{group.label}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-[10rem] bg-background">Одиниця</TableHead>
                    {nights.map((date) => (
                      <TableHead key={date} className="min-w-[8.5rem]">
                        <span className="block normal-case tracking-normal">{formatWeekday(date)}</span>
                        <span className="block normal-case tracking-normal text-foreground">{formatDateShort(date)}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.units.map((unit) => (
                    <TableRow
                      key={unit.roomId}
                      className={highlightedRoomIds.includes(unit.roomId) ? 'bg-[#efe7dc]/60' : undefined}
                    >
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        {unitDisplayTitle({ name: unit.name, number: unit.number })}
                      </TableCell>
                      {unit.nights.map((night) => (
                        <TableCell key={night.date} className="align-top">
                          <PriceCell night={night} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        : null}
    </section>
  )
}
