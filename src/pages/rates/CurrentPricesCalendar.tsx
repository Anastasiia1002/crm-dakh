import { useEffect, useMemo, useState } from 'react'
import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { PageHeader } from '@/components/ui/page-header'
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
    return (
      <span className="inline-flex rounded-sm border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground">
        {CURRENT_PRICE_LABEL.missing}
      </span>
    )
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
  const rangeTooLong = nightCount > CURRENT_PRICES_MAX_NIGHTS
  const inverted = Boolean(firstNight && lastNight && nightCount <= 0)
  const [visibleRange, setVisibleRange] = useState({ firstNight, lastNight })
  useEffect(() => {
    if (nightCount > 0 && !rangeTooLong) {
      setVisibleRange({ firstNight, lastNight })
    }
  }, [firstNight, lastNight, nightCount, rangeTooLong])
  const calendar = useCurrentPricesCalendar(
    inclusiveNightCount(visibleRange.firstNight, visibleRange.lastNight) > 0 ? visibleRange : undefined,
  )

  function applyPreset(next: PricePeriodPresetId) {
    const range = pricePeriodRange(next)
    onRangeChange({ preset: next, firstNight: range.firstNight, lastNight: range.lastNight })
  }

  const groups = calendar.data?.groups ?? []
  const nights = calendar.data?.nights ?? []
  const empty = useMemo(() => groups.every((group) => group.units.length === 0), [groups])

  return (
    <section className="space-y-6">
      <PageHeader
        title="Ціни"
        description="Діючі ціни по номерах і будиночках. Щоб змінити їх — «Змінити ціни»."
        actions={
          canWrite ? (
            <Button type="button" onClick={onEditPrices}>
              Змінити ціни
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 rounded-md border border-border bg-surface p-3 sm:grid-cols-2">
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
                lastNight: end,
              })
            }}
          />
        </Field>
      </div>

      {inverted ? (
        <p className="text-sm text-destructive">Оберіть період, де остання ніч не раніше за першу.</p>
      ) : null}
      {rangeTooLong ? (
        <p className="text-sm text-destructive">Показуйте не більше ніж {CURRENT_PRICES_MAX_NIGHTS} ночей.</p>
      ) : null}

      {calendar.isLoading && !calendar.data ? <LoadingState /> : null}
      {calendar.isError ? (
        <p className="text-sm text-destructive">{errorMessage(calendar.error)}</p>
      ) : null}
      {calendar.data && empty ? <EmptyState>Немає номерів і будиночків</EmptyState> : null}

      {calendar.data && !empty
        ? groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <h2 className="font-serif text-lg font-medium">{group.label}</h2>
              <Table containerClassName="max-h-[min(70vh,40rem)] overflow-auto rounded-md border border-border bg-surface">
                <TableHeader className="sticky top-0 z-20 bg-surface">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-30 min-w-[11rem] bg-surface">Одиниця</TableHead>
                    {nights.map((date) => (
                      <TableHead key={date} className="min-w-[7.5rem] bg-surface">
                        <span className="block normal-case tracking-normal text-muted">{formatWeekday(date)}</span>
                        <span className="block normal-case tracking-normal text-foreground">{formatDateShort(date)}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.units.map((unit) => (
                    <TableRow
                      key={unit.roomId}
                      className={highlightedRoomIds.includes(unit.roomId) ? 'bg-secondary/70' : undefined}
                    >
                      <TableCell className="sticky left-0 z-10 bg-surface font-medium">
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
