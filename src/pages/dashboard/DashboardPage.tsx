import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QueryErrorState } from '@/components/ui/page-status'
import { useAdminDashboardSummary } from '@/hooks/useAdminDashboard'
import { useAdminBookings } from '@/hooks/useBookings'
import { useHotelSettings } from '@/hooks/useHotel'
import { adminBookingRef } from '@/lib/admin-booking-view'
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
import { HOTEL_TIME_ZONE } from '@/lib/dates'
import { formatCount, formatDate } from '@/lib/format'
import { bookingStatusLabel } from '@/lib/labels'

const recentFilters = {
  page: 1,
  limit: 8,
  search: '',
  status: 'all' as const,
  source: 'all' as const,
  roomId: 'all' as const,
  checkIn: '',
  checkOut: '',
}

export function DashboardPage() {
  const hotel = useHotelSettings()
  const timezone = hotel.data?.timezone?.trim() || HOTEL_TIME_ZONE
  const defaults = useMemo(() => defaultDashboardPeriod(new Date(), timezone), [timezone])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [edited, setEdited] = useState(false)

  useEffect(() => {
    if (!edited) {
      setFrom(defaults.from)
      setTo(defaults.to)
    }
  }, [defaults.from, defaults.to, edited])

  const period = parseDashboardPeriod(from, to)
  const summary = useAdminDashboardSummary(from, to, { enabled: period.ok })
  const recent = useAdminBookings(recentFilters)
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

  function changeFrom(value: string) {
    setEdited(true)
    setFrom(value)
  }

  function changeTo(value: string) {
    setEdited(true)
    setTo(value)
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-serif text-3xl font-medium">Головна</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Зведення з сервера за вибраний період і знімок на сьогодні. Це не отриманий дохід і не список
          останніх створених бронювань.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Період від</span>
            <Input
              type="date"
              value={from}
              onChange={(event) => changeFrom(event.target.value)}
              className="w-40"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Період до</span>
            <Input type="date" value={to} onChange={(event) => changeTo(event.target.value)} className="w-40" />
          </label>
        </div>
        {!period.ok ? (
          <p className="text-sm text-destructive" role="alert">
            {period.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Дати включно. Часовий пояс готелю: {summary.data?.timezone ?? timezone}.
          </p>
        )}

        {period.ok && view.kind === 'loading' ? (
          <p className="text-sm text-muted-foreground" aria-busy="true" aria-live="polite">
            Завантажуємо зведення…
          </p>
        ) : null}

        {period.ok && view.kind === 'unavailable' ? (
          <section className="max-w-xl space-y-2 border-y border-border py-6">
            <h3 className="font-serif text-2xl">{view.title}</h3>
            <p className="text-sm text-muted-foreground">{view.detail}</p>
          </section>
        ) : null}

        {period.ok && view.kind === 'error' ? (
          <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : null}

        {period.ok && view.kind === 'ready' && summary.data ? <DashboardKpis summary={summary.data} /> : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-2xl">Останні бронювання</h3>
        {recent.isLoading ? <p className="text-sm text-muted-foreground">Завантажуємо бронювання…</p> : null}
        {recent.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              Не вдалося завантажити дані.
            </p>
            <Button type="button" variant="outline" onClick={() => void recent.refetch()}>
              Повторити
            </Button>
          </div>
        ) : null}
        {recent.data && recent.data.pagination.total === 0 ? (
          <p className="text-sm text-muted-foreground">Бронювань ще немає.</p>
        ) : null}
        {recent.data && recent.data.items.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {recent.data.items.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <Link to={`/admin/bookings/${booking.id}`} className="font-medium underline-offset-4 hover:underline">
                  {adminBookingRef(booking.id)}
                </Link>
                <span>
                  {booking.guest.lastName} {booking.guest.firstName}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                </span>
                <span>{bookingStatusLabel[booking.status]}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Це останні створені бронювання, не підсумок за період і не отриманий дохід.
        </p>
      </section>
    </div>
  )
}

function DashboardKpis({ summary }: { summary: AdminDashboardSummary }) {
  const periodItems = [
    {
      label: 'Бронювання за період',
      value: formatCount(summary.bookings.total),
      hint: BOOKINGS_OVERLAP_HINT,
    },
    { label: 'Підтверджені', value: formatCount(summary.bookings.confirmed) },
    { label: 'Скасовані', value: formatCount(summary.bookings.cancelled) },
    { label: 'Сума бронювань', value: bookingValueLabel(summary.bookingValue.amount, summary.bookingValue.currency) },
  ]
  const todayItems = [
    { label: 'Заїзди сьогодні', value: formatCount(summary.arrivals.checkInsToday) },
    { label: 'Виїзди сьогодні', value: formatCount(summary.departures.checkOutsToday) },
    { label: 'Зайняті номери', value: formatCount(summary.occupancy.occupied) },
    { label: 'Вільні номери', value: formatCount(summary.occupancy.available) },
    { label: 'Заблоковані номери', value: formatCount(summary.occupancy.blocked) },
    { label: 'Завантаженість', value: occupancyPercentLabel(summary.occupancy.percent) },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="font-serif text-2xl">За вибраний період</h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(summary.period.from)} — {formatDate(summary.period.to)}. {BOOKINGS_OVERLAP_HINT}
        </p>
        <KpiGrid items={periodItems} />
        <p className="text-xs text-muted-foreground">
          Сума бронювань у гривнях — підсумок сервера за період. Скасовані не входять. Це не отримані оплати.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-serif text-2xl">Сьогодні</h3>
        <p className="text-sm text-muted-foreground">
          Знімок на {formatDate(summary.today)}, не підсумок за вибраний період.
        </p>
        <KpiGrid items={todayItems} />
        {summary.occupancy.percent === null ? (
          <p className="text-xs text-muted-foreground">Сьогодні немає продаваних номерів, тому завантаженість не рахується.</p>
        ) : null}
      </div>

      {!summary.payments.available ? (
        <p className="text-sm text-muted-foreground">{PAYMENTS_UNAVAILABLE_LABEL}</p>
      ) : null}
    </div>
  )
}

function KpiGrid({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string }>
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase" title={item.hint}>
            {item.label}
          </dt>
          <dd className="mt-1 font-serif text-2xl leading-none tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
