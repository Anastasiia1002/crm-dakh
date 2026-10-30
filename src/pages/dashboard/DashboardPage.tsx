import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAdminBookings } from '@/hooks/useBookings'
import { adminBookingRef } from '@/lib/admin-booking-view'
import { resolveDashboardView } from '@/lib/dashboard-state'
import { formatDate } from '@/lib/format'
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
  const summary = resolveDashboardView({ summaryEndpoint: false })
  const recent = useAdminBookings(recentFilters)

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-serif text-3xl font-medium">Головна</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Операційні цифри з’являться тут лише після зведення з сервера.
        </p>
      </div>
      {summary.kind === 'unavailable' ? (
        <section className="max-w-xl space-y-2 border-y border-border py-6">
          <h3 className="font-serif text-2xl">{summary.title}</h3>
          <p className="text-sm text-muted-foreground">{summary.detail}</p>
        </section>
      ) : null}

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
