import { formatCount, formatDate, formatMoneyAmount, nightsLabel } from '@/lib/format'
import type { AdminGuestImportedStats, AdminGuestStats } from '@/lib/admin-guests'

export function GuestStats({
  stats,
  importedStats = null,
}: {
  stats: AdminGuestStats
  importedStats?: AdminGuestImportedStats | null
}) {
  const spent = stats.currency === 'UAH' ? formatMoneyAmount(stats.totalSpent) : `${stats.totalSpent} ${stats.currency}`
  const items = [
    { label: 'Бронювань', value: formatCount(stats.bookingsCount) },
    { label: 'Завершених візитів', value: formatCount(stats.visitCount) },
    { label: 'Ночей', value: nightsLabel(stats.totalNights) },
    { label: 'Сума бронювань', value: spent },
    { label: 'Останній візит', value: stats.lastVisit ? formatDate(stats.lastVisit) : '—' },
  ]
  const importedSpent = importedStats
    ? formatMoneyAmount(importedStats.spendAmount)
    : null
  const importedItems = importedStats
    ? [
        { label: 'Імпортованих візитів', value: formatCount(importedStats.stayCount) },
        { label: 'Імпортованих ночей', value: nightsLabel(importedStats.nightCount) },
        { label: 'Імпортована сума', value: importedSpent ?? importedStats.spendAmount },
        { label: 'Останній імпортований візит', value: importedStats.lastStayOn ? formatDate(importedStats.lastStayOn) : '—' },
      ]
    : []

  return (
    <div className="space-y-6">
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
      {importedStats ? (
        <div className="space-y-2">
          <h3 className="font-medium">Імпортована історія (не бронювання у CRM)</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 md:grid-cols-4">
            {importedItems.map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{item.label}</dt>
                <dd className="mt-1 font-serif text-2xl leading-none tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Ці цифри з файлу імпорту. Вони не додаються до бронювань у CRM і не є отриманими оплатами.
          </p>
        </div>
      ) : null}
    </div>
  )
}
