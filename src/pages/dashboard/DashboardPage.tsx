import { useEffect, useMemo, useState } from 'react'
import { OperationsBoard } from '@/components/dashboard/OperationsBoard'
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
  const [operationalDate, setOperationalDate] = useState(defaults.to)
  const [dateEdited, setDateEdited] = useState(false)

  useEffect(() => {
    if (!edited) {
      setFrom(defaults.from)
      setTo(defaults.to)
    }
    if (!dateEdited) setOperationalDate(defaults.to)
  }, [defaults.from, defaults.to, edited, dateEdited])

  const period = parseDashboardPeriod(from, to)
  const [summaryEnabled, setSummaryEnabled] = useState(false)
  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window)
    if (idle) {
      const id = idle(() => setSummaryEnabled(true), { timeout: 800 })
      return () => window.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(() => setSummaryEnabled(true), 50)
    return () => window.clearTimeout(timer)
  }, [])
  const summary = useAdminDashboardSummary(from, to, { enabled: period.ok && summaryEnabled })
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
      <header>
        <h2 className="font-serif text-3xl font-medium tracking-tight">Огляд готелю</h2>
      </header>

      <OperationsBoard
        date={operationalDate}
        timeZone={timezoneLabel}
        onDate={(next) => {
          setDateEdited(true)
          setOperationalDate(next)
        }}
      />

      <section className="space-y-4 border-t border-border pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-serif text-2xl">Аналітика періоду</h3>
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
        </div>

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
      </section>
    </div>
  )
}

function DashboardBody({ summary }: { summary: AdminDashboardSummary }) {
  return (
    <div className="space-y-4">
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
          label="Скасовані в періоді"
          value={formatCount(summary.bookings.cancelled)}
          hint="Статус «Скасовано» серед бронювань, чиє проживання перетинає період."
        />
        <KpiCard label="Оплати" value="—" hint={PAYMENTS_UNAVAILABLE_LABEL} detail={PAYMENTS_UNAVAILABLE_LABEL} />
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
