import { QueryErrorState } from '@/components/ui/page-status'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { useAdminServices } from '@/hooks/useAdminServices'
import { formatCatalogPrice } from '@/lib/admin-services'

export function ServicesPage() {
  const catalog = useAdminServices()
  const items = catalog.data ?? []

  return (
    <div className="space-y-4">
      <SectionHeading title="Додаткові послуги" />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Активний каталог цього готелю. Ціни показує сервер у гривнях. Додати або змінити послугу тут неможливо — каталог
        лише для перегляду та вибору в бронюванні.
      </p>
      {catalog.isLoading && !catalog.data ? <LoadingState label="Завантаження каталогу послуг…" /> : null}
      {catalog.isError ? (
        <QueryErrorState
          title="Не вдалося завантажити каталог послуг"
          error={catalog.error}
          onRetry={() => void catalog.refetch()}
        />
      ) : null}
      {!catalog.isLoading && !catalog.isError && items.length === 0 ? (
        <EmptyState>Активних послуг немає.</EmptyState>
      ) : null}
      {!catalog.isError && items.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
              </div>
              <p className="shrink-0 tabular-nums text-sm">{formatCatalogPrice(item.price)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
