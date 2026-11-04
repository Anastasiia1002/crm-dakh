import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QueryErrorState } from '@/components/ui/page-status'
import { useAdminDashboardSummary } from '@/hooks/useAdminDashboard'
import { useHotelSettings } from '@/hooks/useHotel'
import { resolveDashboardView } from '@/lib/dashboard-state'
import {
  BOOKINGS_OVERLAP_HINT,
  PAYMENTS_UNAVAILABLE_LABEL,
  bookingValueLabel,
  defaultDashboardPeriod,
  isDashboardNotFound,
  occupancyPercentLabel,
  parseDashboardPeriod,
  type AdminDashboardSummary,
} from '@/lib/dashboard-summary'
import { addCalendarDays, HOTEL_TIME_ZONE } from '@/lib/dates'
import { formatCount, formatDate } from '@/lib/format'

type Preset = 'month' | '7' | '30' | null

export function DashboardPage() {
  const hotel = useHotelSettings()
  const timezone = hotel.data?.timezone?.trim() || HOTEL_TIME_ZONE
  const defaults = useMemo(() => defaultDashboardPeriod(new Date(), timezone), [timezone])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [edited, setEdited] = useState(false)
  const [preset, setPreset] = useState<Preset>('month')

  useEffect(() => {
    if (!edited) {
      setFrom(defaults.from)
      setTo(defaults.to)
    }
  }, [defaults.from, defaults.to, edited])

  const period = parseDashboardPeriod(from, to)
  const summary = useAdminDashboardSummary(from, to, { enabled: period.ok })
  const view = resolveDashboardView({
    summaryEndpoint: true,
    phase: !period.ok
      ? 'ready'
      : summary.isPending
        ? 'loading'
        : summary.isError
          ? isDashboardNotFound(summary.error)
            ? 'unavailable'
            : 'error'
          : summary.data
            ? 'ready'
            : 'loading',
  })
  const timezoneLabel = summary.data?.timezone ?? timezone

  function applyPreset(next: Exclude<Preset, null>) {
    const end = defaults.to
    const start = next === '7' ? addCalendarDays(end, -6) : next === '30' ? addCalendarDays(end, -29) : defaults.from
    setEdited(true)
    setPreset(next)
    setFrom(start)
    setTo(end)
  }

  return (
    <div className="space-y-8">
      {/* Daily booking trend is not in GET /api/admin/dashboard/summary. No chart until that series exists. */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-medium tracking-tight">Огляд готелю</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {period.ok ? `${formatDate(from)} — ${formatDate(to)}` : 'Оберіть період'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Часовий пояс готелю: {timezoneLabel}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-md border border-border bg-surface p-0.5">
            <PresetButton active={preset === 'month'} onClick={() => applyPreset('month')}>
              Місяць
            </PresetButton>
            <PresetButton active={preset === '7'} onClick={() => applyPreset('7')}>
              7 днів
            </PresetButton>
            <PresetButton active={preset === '30'} onClick={() => applyPreset('30')}>
              30 днів
            </PresetButton>
          </div>
          <label className="space-y-1">
            <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Від</span>
            <Input
              type="date"
              value={from}
              onChange={(event) => {
                setEdited(true)
                setPreset(null)
                setFrom(event.target.value)
              }}
              className="w-36 bg-surface"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">До</span>
            <Input
              type="date"
              value={to}
              onChange={(event) => {
                setEdited(true)
                setPreset(null)
                setTo(event.target.value)
              }}
              className="w-36 bg-surface"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!period.ok || summary.isFetching}
            aria-busy={summary.isFetching || undefined}
            onClick={() => void summary.refetch()}
          >
            {summary.isFetching ? 'Оновлюємо…' : 'Оновити'}
          </Button>
        </div>
      </header>

      {!period.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {period.message}
        </p>
      ) : null}

      {period.ok && view.kind === 'loading' ? <DashboardSkeleton /> : null}

      {period.ok && view.kind === 'unavailable' ? (
        <section className="max-w-xl space-y-2 rounded-md border border-border bg-surface px-5 py-6">
          <h3 className="font-serif text-2xl">{view.title}</h3>
          <p className="text-sm text-muted-foreground">{view.detail}</p>
        </section>
      ) : null}

      {period.ok && view.kind === 'error' ? (
        <QueryErrorState error={summary.error} title="Не вдалося завантажити дані." onRetry={() => void summary.refetch()} />
      ) : null}

      {period.ok && view.kind === 'ready' && summary.data ? <DashboardBody summary={summary.data} /> : null}
    </div>
  )
}

function DashboardBody({ summary }: { summary: AdminDashboardSummary }) {
  const occupiedLabel = `${formatCount(summary.occupancy.occupied)} / ${formatCount(summary.occupancy.sellable)}`
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Бронювання"
          value={formatCount(summary.bookings.total)}
          hint={BOOKINGS_OVERLAP_HINT}
        />
        <KpiCard
          label="Сума бронювань"
          value={bookingValueLabel(summary.bookingValue.amount, summary.bookingValue.currency)}
          detail="Це не отримані оплати."
          hint="Це не отримані оплати."
        />
        <KpiCard
          label="Зайнято зараз"
          value={occupiedLabel}
          detail={`Вільні: ${formatCount(summary.occupancy.available)}`}
          hint="Заблоковані не входять у продавані місця. Відсоток рахується від зайнятих і вільних."
        />
        <KpiCard
          label="Завантаженість"
          value={occupancyPercentLabel(summary.occupancy.percent)}
          detail={summary.occupancy.percent === null ? 'Немає продаваних місць.' : undefined}
          hint="Знімок на сьогодні, не підсумок за період."
        />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Заїзди сьогодні" value={formatCount(summary.arrivals.checkInsToday)} />
        <Metric label="Виїзди сьогодні" value={formatCount(summary.departures.checkOutsToday)} />
        <Metric label="Скасовані" value={formatCount(summary.bookings.cancelled)} />
        <Metric label="Заблоковані" value={formatCount(summary.occupancy.blocked)} />
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <div className="rounded-md border border-border bg-surface px-5 py-4">
          <h3 className="font-serif text-xl">Сьогодні</h3>
          <p className="mt-1 text-sm text-muted-foreground">Знімок на {formatDate(summary.today)}, не підсумок за період.</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-muted-foreground">Заїзди</dt>
              <dd className="mt-1 font-serif text-3xl tabular-nums">{formatCount(summary.arrivals.checkInsToday)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Виїзди</dt>
              <dd className="mt-1 font-serif text-3xl tabular-nums">{formatCount(summary.departures.checkOutsToday)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-md border border-border bg-surface px-5 py-4">
          <div>
            <h3 className="font-serif text-xl">Дії</h3>
            <p className="mt-1 text-sm text-muted-foreground">{PAYMENTS_UNAVAILABLE_LABEL}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/bookings">Бронювання</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/calendar">Календар наявності</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  hint,
}: {
  label: string
  value: string
  detail?: string
  hint: string
}) {
  return (
    <article className="rounded-md border border-border bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[11px] tracking-[0.14em] text-muted uppercase">{label}</h3>
        <Hint text={hint} />
      </div>
      <p className="mt-3 font-serif text-3xl leading-none tabular-nums sm:text-4xl">{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums">{value}</p>
    </div>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      title={text}
      aria-label={text}
    >
      i
    </button>
  )
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-live="polite">
      <p className="sr-only">Завантажуємо зведення…</p>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-md border border-border bg-surface-muted" />
      ))}
    </div>
  )
}
