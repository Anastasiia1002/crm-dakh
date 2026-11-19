import { useQuery } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listAllRoomTypes } from '@/api/accommodations'
import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Checkbox } from '@/components/ui/checkbox'
import { QueryErrorState } from '@/components/ui/page-status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccommodationMultiSelect } from '@/components/analytics/AccommodationMultiSelect'
import { useAdminAnalyticsSummary } from '@/hooks/useAdminAnalytics'
import { useAllAdminRooms, useHotelSettings } from '@/hooks/useHotel'
import {
  ANALYTICS_DATE_TYPE_HINT,
  ANALYTICS_DATE_TYPES,
  ANALYTICS_NONE,
  ANALYTICS_STATUSES,
  analyticsDateTypeLabel,
  analyticsStaffHint,
  analyticsPeriodReady,
  nextAnalyticsKindCategoryFilter,
  analyticsPresetRange,
  analyticsSearchParams,
  barPercent,
  bookingListHref,
  moneyOrUnavailable,
  parseAnalyticsSearch,
  type AnalyticsFilterState,
  type AnalyticsPeriodPreset,
  type AdminAnalyticsSummary,
} from '@/lib/analytics-summary'
import { bookingRoomFilterLabel } from '@/lib/accommodation-labels'
import { HOTEL_TIME_ZONE } from '@/lib/dates'
import { formatCount, formatMoneyAmount } from '@/lib/format'
import { bookingStatusLabel } from '@/lib/labels'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { canReadAnalytics } from '@/lib/roles'

export function AnalyticsPage() {
  const { user } = useAuth()
  const hotel = useHotelSettings()
  const timezone = hotel.data?.timezone?.trim() || HOTEL_TIME_ZONE
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseAnalyticsSearch(searchParams, new Date(), timezone), [searchParams, timezone])
  const period = analyticsPeriodReady(filters.from, filters.to)
  const summary = useAdminAnalyticsSummary(filters, { enabled: period.ok && canReadAnalytics(user?.role) })
  const rooms = useAllAdminRooms()
  const roomTypes = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })

  if (!canReadAnalytics(user?.role)) {
    return (
      <div className="max-w-xl space-y-3 border-t border-border py-10">
        <h2 className="font-serif text-[1.7rem] font-medium">Немає доступу</h2>
        <p className="text-sm text-muted-foreground">Аналітика доступна власнику та адміністратору.</p>
      </div>
    )
  }

  function patch(next: Partial<AnalyticsFilterState>) {
    setSearchParams(analyticsSearchParams({ ...filters, ...next }), { replace: true })
  }

  function applyPreset(preset: Exclude<AnalyticsPeriodPreset, 'custom'>) {
    const range = analyticsPresetRange(preset, new Date(), timezone)
    patch({ from: range.from, to: range.to })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Аналітика"
        description="Спочатку період, потім номери чи будиночки, далі зведення. Статуси можна звузити окремо. Огляд готелю лишається операційною сторінкою. Сума бронювання — не отриманий дохід."
      />

      <section className="space-y-8 border-y border-border py-5">
        <FilterStep step={1} title="Оберіть період" hint={ANALYTICS_DATE_TYPE_HINT}>
          <div className="flex flex-wrap items-end gap-3">
            <Filter label="Які дати в періоді">
              <Select value={filters.dateType} onValueChange={(value) => patch({ dateType: value as AnalyticsFilterState['dateType'] })}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYTICS_DATE_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {analyticsDateTypeLabel[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Період">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('currentMonth')}>
                  Поточний місяць
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('previousMonth')}>
                  Попередній
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('nextMonth')}>
                  Наступний
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('currentYear')}>
                  Рік
                </Button>
              </div>
            </Filter>
            <Filter label="Період">
              <DateRangePicker
                start={filters.from}
                end={filters.to}
                allowPast
                onChange={({ start, end }) => patch({ from: start, ...(end ? { to: end } : {}) })}
              />
            </Filter>
          </div>
          <p className="text-xs text-muted-foreground">
            Дати включно. Проживання — ночі між заїздом і виїздом. Створення й скасування — за північчю готелю (
            {summary.data?.timezone ?? timezone}).
          </p>
          {!period.ok ? (
            <p className="text-sm text-destructive" role="alert">
              {period.message}
            </p>
          ) : null}
        </FilterStep>

        <FilterStep
          step={2}
          title="Оберіть номери та будиночки"
          hint="Два списки, щоб не змішувати номери з будиночками. Нижче — пошук конкретного проживання."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {(['ROOM', 'COTTAGE'] as const).map((kind) => {
              const allIds = (roomTypes.data ?? []).map((type) => type.id)
              const kindIds = (roomTypes.data ?? []).filter((type) => type.kind === kind).map((type) => type.id)
              return (
                <MultiFilter
                  key={kind}
                  label={kind === 'ROOM' ? 'Номери' : 'Будиночки'}
                  items={(roomTypes.data ?? [])
                    .filter((type) => type.kind === kind)
                    .map((type) => ({ id: type.id, label: type.name }))}
                  value={filters.categoryIds}
                  onChange={(next) =>
                    patch({
                      categoryIds: nextAnalyticsKindCategoryFilter(
                        filters.categoryIds,
                        kindIds,
                        allIds,
                        next === 'all' ? kindIds : next === ANALYTICS_NONE ? [] : next,
                      ),
                    })
                  }
                  loading={roomTypes.isLoading}
                  error={roomTypes.isError}
                />
              )
            })}
          </div>
          <AccommodationMultiSelect
            label="Конкретне проживання"
            options={(rooms.data ?? []).map((room) => {
              const type = roomTypes.data?.find((item) => item.id === room.roomTypeId)
              const typeName = type?.name
              const kindLabel = type?.kind === 'COTTAGE' ? 'Будиночки' : 'Номери'
              return {
                id: room.id,
                label: bookingRoomFilterLabel(room, typeName),
                searchText: `${bookingRoomFilterLabel(room, typeName)} ${room.number} ${room.name ?? ''}`,
                groupId: type?.kind ?? 'ROOM',
                groupLabel: kindLabel,
              }
            })}
            value={filters.roomIds}
            onChange={(roomIds) => patch({ roomIds })}
            loading={rooms.isLoading}
            error={rooms.isError}
          />
        </FilterStep>

        <FilterStep step={3} title="За потреби звузьте статуси" hint="За замовчуванням зведення враховує всі статуси в періоді.">
          <MultiFilter
            label="Статуси"
            items={ANALYTICS_STATUSES.map((status) => ({ id: status, label: bookingStatusLabel[status] }))}
            value={filters.statuses}
            onChange={(statuses) => patch({ statuses: statuses as AnalyticsFilterState['statuses'] })}
          />
        </FilterStep>
      </section>

      {period.ok && summary.isPending ? (
        <p className="text-sm text-muted-foreground" aria-busy="true" aria-live="polite">
          Завантажуємо аналітику…
        </p>
      ) : null}
      {period.ok && summary.isError ? <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} /> : null}
      {period.ok && summary.data ? (
        <section className="space-y-8">
          <h3 className="font-serif text-2xl">4. Зведення</h3>
          <AnalyticsBody summary={summary.data} filters={filters} />
        </section>
      ) : null}
    </div>
  )
}

function AnalyticsBody({ summary, filters }: { summary: AdminAnalyticsSummary; filters: AnalyticsFilterState }) {
  const definitions = summary.definitions
  const empty = summary.bookings.total === 0
  return (
    <div className="space-y-10">
      <KpiGroup title="Фінанси">
        <Kpi
          label="Вартість бронювань"
          value={moneyOrUnavailable(summary.financial.bookingValue)}
          hint={analyticsStaffHint('bookingValue', definitions.bookingValue)}
        />
        <Kpi
          label="Дохід"
          value={moneyOrUnavailable(summary.financial.revenue)}
          hint={analyticsStaffHint('revenue', definitions.revenue)}
        />
        <Kpi
          label="Середній чек"
          value={moneyOrUnavailable(summary.financial.averageCheck)}
          hint={analyticsStaffHint('averageCheck', definitions.averageCheck)}
        />
        <Kpi
          label="Очікує на оплату"
          value={moneyOrUnavailable(summary.financial.outstanding)}
          hint={analyticsStaffHint('outstanding', definitions.outstanding)}
        />
        <Kpi
          label="Сума знижок"
          value={moneyOrUnavailable(summary.financial.discounts)}
          hint={analyticsStaffHint('discounts', definitions.discounts)}
        />
      </KpiGroup>

      <KpiGroup
        title="Клієнти"
        action={
          <Link to="/admin/guests" className="text-sm underline-offset-4 hover:underline">
            Відкрити клієнтів
          </Link>
        }
      >
        <Kpi label="Всього клієнтів" value={formatCount(summary.guests.unique)} hint={analyticsStaffHint('guests', definitions.guests)} />
        <Kpi label="Нові клієнти" value={formatCount(summary.guests.new)} hint={analyticsStaffHint('guests', definitions.guests)} />
        <Kpi
          label="Повторні візити"
          value={formatCount(summary.guests.repeatVisits)}
          hint={analyticsStaffHint('guests', definitions.guests)}
        />
      </KpiGroup>

      <KpiGroup title="Бронювання">
        <Kpi
          label="Всього бронювань"
          value={formatCount(summary.bookings.total)}
          hint={analyticsStaffHint('total', definitions.total)}
          to={bookingListHref(filters, 'all')}
        />
        <Kpi
          label="Скасовані"
          value={formatCount(summary.bookings.cancelled)}
          hint={analyticsStaffHint('cancelled', definitions.cancelled)}
          to={bookingListHref(filters, 'cancelled')}
        />
        <Kpi
          label="Виконані"
          value={formatCount(summary.bookings.completed)}
          hint={analyticsStaffHint('completed', definitions.completed)}
          to={bookingListHref(filters, 'completed')}
        />
        <Kpi
          label="Незавершені"
          value={formatCount(summary.bookings.incomplete)}
          hint={analyticsStaffHint('incomplete', definitions.incomplete)}
        />
      </KpiGroup>

      <KpiGroup title="Скасування">
        <Kpi
          label="Скасовані зараз"
          value={`${formatCount(summary.cancellations.currentlyCancelled.count)} · ${formatMoneyAmount(summary.cancellations.currentlyCancelled.amount)}`}
          hint={analyticsStaffHint('currentlyCancelled', definitions.currentlyCancelled)}
          to={bookingListHref(filters, 'cancelled')}
        />
        <Kpi
          label="Скасовані за період"
          value={`${formatCount(summary.cancellations.cancelledDuringPeriod.count)} · ${formatMoneyAmount(summary.cancellations.cancelledDuringPeriod.amount)}`}
          hint={analyticsStaffHint('cancelledDuringPeriod', definitions.cancelledDuringPeriod)}
        />
      </KpiGroup>

      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard title="Джерела бронювань" hint={analyticsStaffHint('sources', definitions.sources)} empty={empty || summary.sources.length === 0}>
          {summary.sources.map((row) => (
            <BarRow key={row.source} label={row.label} value={`${formatCount(row.count)} · ${row.percent}%`} percent={row.percent} />
          ))}
        </ChartCard>
        <ChartCard title="Броні по номерах" hint={analyticsStaffHint('accommodations', definitions.accommodations)} empty={empty || summary.accommodations.length === 0}>
          {summary.accommodations.map((row) => (
            <BarRow
              key={row.roomId}
              label={`${row.name}${row.active ? '' : ' (неактивний)'}`}
              value={formatCount(row.count)}
              percent={barPercent(row.count, summary.bookings.total)}
            />
          ))}
        </ChartCard>
      </div>
    </div>
  )
}

function FilterStep({
  step,
  title,
  hint,
  children,
}: {
  step: number
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">
          {step}. {title}
        </h3>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">{label}</span>
      {children}
    </label>
  )
}

function MultiFilter({
  label,
  items,
  value,
  onChange,
  loading,
  error,
}: {
  label: string
  items: { id: string; label: string }[]
  value: string[] | typeof ANALYTICS_NONE | 'all'
  onChange: (value: string[] | typeof ANALYTICS_NONE | 'all') => void
  loading?: boolean
  error?: boolean
}) {
  const selected = value === 'all' ? items.map((item) => item.id) : value === ANALYTICS_NONE ? [] : value
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange('all')}>
          Обрати всі
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(ANALYTICS_NONE)}>
          Очистити
        </Button>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Завантажуємо список…</p> : null}
      {error ? <p className="text-xs text-destructive">Не вдалося завантажити повний список.</p> : null}
      <div className="flex max-h-40 flex-wrap gap-x-4 gap-y-2 overflow-y-auto">
        {items.map((item) => {
          const checked = selected.includes(item.id)
          return (
            <label key={item.id} className="flex max-w-full items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => {
                  const ids = new Set(selected)
                  if (next === true) ids.add(item.id)
                  else ids.delete(item.id)
                  if (ids.size === 0) onChange(ANALYTICS_NONE)
                  else if (ids.size === items.length) onChange('all')
                  else onChange([...ids])
                }}
              />
              <span className="truncate">{item.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function KpiGroup({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-2xl">{title}</h3>
        {action}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function Kpi({ label, value, hint, to }: { label: string; value: string; hint?: string; to?: string }) {
  const body = (
    <article className="min-w-0 space-y-1 border-t border-border pt-3">
      <p className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="font-sans text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  )
  if (!to) return body
  return (
    <Link to={to} className="min-w-0 rounded-sm outline-none hover:bg-surface-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40">
      {body}
    </Link>
  )
}

function ChartCard({
  title,
  hint,
  empty,
  children,
}: {
  title: string
  hint?: string
  empty: boolean
  children: ReactNode
}) {
  return (
    <section className="min-w-0 space-y-3">
      <h3 className="font-serif text-2xl">{title}</h3>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {empty ? <p className="text-sm text-muted-foreground">Немає даних за вибраним фільтром.</p> : <div className="space-y-3">{children}</div>}
    </section>
  )
}

function BarRow({ label, value, percent }: { label: string; value: string; percent: string }) {
  const width = Math.min(100, Math.max(0, Number.parseFloat(percent) || 0))
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden bg-surface-muted">
        <div className={cn('h-full bg-primary')} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
