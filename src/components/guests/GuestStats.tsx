import { formatCount, formatDate, formatMoneyAmount, nightsLabel } from '@/lib/format'
import type { AdminGuestStats } from '@/lib/admin-guests'

export function GuestStats({ stats }: { stats: AdminGuestStats }) {
  const spent = stats.currency === 'UAH' ? formatMoneyAmount(stats.totalSpent) : `${stats.totalSpent} ${stats.currency}`
  const items = [
    { label: 'Бронювань', value: formatCount(stats.bookingsCount) },
    { label: 'Завершених проживань', value: formatCount(stats.completedStays) },
    { label: 'Ночей', value: nightsLabel(stats.totalNights) },
    { label: 'Сума бронювань', value: spent },
    { label: 'Останній заїзд', value: stats.lastCheckIn ? formatDate(stats.lastCheckIn) : '—' },
  ]

  return (
    <div className="space-y-2">
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 md:grid-cols-5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 font-serif text-2xl leading-none tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
    <p className="text-xs text-muted-foreground">
      Сума бронювань — це підсумок, який порахував сервер. Скасовані бронювання та неявки не входять. Це не отримані оплати.
    </p>
    </div>
  )
}
