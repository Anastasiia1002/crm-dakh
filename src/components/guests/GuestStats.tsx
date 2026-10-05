import { formatCount, formatDate, formatMoney, nightsLabel } from '@/lib/format'
import type { GuestStats as GuestStatsData } from '@/types'

export function GuestStats({ stats }: { stats: GuestStatsData }) {
  const items = [
    { label: 'Бронювань', value: formatCount(stats.bookingsCount) },
    { label: 'Завершених проживань', value: formatCount(stats.completedStays) },
    { label: 'Ночей', value: nightsLabel(stats.totalNights) },
    { label: 'Витрачено', value: formatMoney(stats.totalSpent) },
    { label: 'Останнє бронювання', value: stats.lastBookingDate ? formatDate(stats.lastBookingDate) : '—' },
  ]

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 md:grid-cols-5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 font-serif text-2xl leading-none tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
