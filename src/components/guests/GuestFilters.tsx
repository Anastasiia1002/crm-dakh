import { Input } from '@/components/ui/input'
import { LAST_VISIT_FILTERS, type LastVisitFilter } from '@/lib/admin-guests'

const LAST_VISIT_LABEL: Record<LastVisitFilter, string> = {
  all: 'Усі',
  over_30: 'Понад 30 днів',
  over_60: 'Понад 60 днів',
  over_90: 'Понад 90 днів',
  over_120: 'Понад 120 днів',
  over_180: 'Понад 180 днів',
  over_365: 'Понад 1 рік',
  over_730: 'Понад 2 роки',
  never: 'Ніколи не відвідували',
}

const SORT_OPTIONS = [
  { value: 'fullName', label: 'ПІБ' },
  { value: 'phone', label: 'Телефон' },
  { value: 'visitCount', label: 'Візити' },
  { value: 'lastVisit', label: 'Останній візит' },
  { value: 'createdAt', label: 'Реєстрація' },
] as const

export function GuestFilters({
  search,
  lastVisit,
  visitCountMin,
  visitCountMax,
  registeredFrom,
  registeredTo,
  sort,
  order,
  onSearch,
  onLastVisit,
  onVisitCountMin,
  onVisitCountMax,
  onRegisteredFrom,
  onRegisteredTo,
  onSort,
  onOrder,
  onClear,
}: {
  search: string
  lastVisit: LastVisitFilter
  visitCountMin: string
  visitCountMax: string
  registeredFrom: string
  registeredTo: string
  sort: 'fullName' | 'phone' | 'visitCount' | 'lastVisit' | 'createdAt'
  order: 'asc' | 'desc'
  onSearch: (search: string) => void
  onLastVisit: (value: LastVisitFilter) => void
  onVisitCountMin: (value: string) => void
  onVisitCountMax: (value: string) => void
  onRegisteredFrom: (value: string) => void
  onRegisteredTo: (value: string) => void
  onSort: (value: 'fullName' | 'phone' | 'visitCount' | 'lastVisit' | 'createdAt') => void
  onOrder: (value: 'asc' | 'desc') => void
  onClear: () => void
}) {
  const dirty =
    search.trim().length > 0 ||
    lastVisit !== 'all' ||
    visitCountMin !== '' ||
    visitCountMax !== '' ||
    registeredFrom !== '' ||
    registeredTo !== '' ||
    sort !== 'fullName' ||
    order !== 'asc'

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Пошук за ім'ям, телефоном або email"
        aria-label="Пошук за ім'ям, телефоном або email"
        className="max-w-xl"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Останній візит</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={lastVisit}
            onChange={(event) => onLastVisit(event.target.value as LastVisitFilter)}
          >
            {LAST_VISIT_FILTERS.map((value) => (
              <option key={value} value={value}>
                {LAST_VISIT_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Візитів від</span>
          <Input type="number" min={0} value={visitCountMin} onChange={(event) => onVisitCountMin(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Візитів до</span>
          <Input type="number" min={0} value={visitCountMax} onChange={(event) => onVisitCountMax(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Реєстрація від</span>
          <Input type="date" value={registeredFrom} onChange={(event) => onRegisteredFrom(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Реєстрація до</span>
          <Input type="date" value={registeredTo} onChange={(event) => onRegisteredTo(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Сортування</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={sort}
            onChange={(event) => onSort(event.target.value as (typeof SORT_OPTIONS)[number]['value'])}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Напрямок</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={order}
            onChange={(event) => onOrder(event.target.value as 'asc' | 'desc')}
          >
            <option value="asc">За зростанням</option>
            <option value="desc">За спаданням</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="h-10 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
        onClick={onClear}
        disabled={!dirty}
      >
        Скинути фільтри
      </button>
    </div>
  )
}
