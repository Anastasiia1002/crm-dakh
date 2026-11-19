import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    <div className="filter-toolbar rounded-md border border-border bg-surface p-3">
      <label className="min-w-[16rem] flex-[2] space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Пошук</span>
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Імʼя, телефон або email"
          aria-label="Пошук за ім'ям, телефоном або email"
        />
      </label>
      <label className="min-w-[10rem] flex-1 space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Останній візит</span>
        <Select value={lastVisit} onValueChange={(value: LastVisitFilter) => onLastVisit(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAST_VISIT_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {LAST_VISIT_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="w-28 space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Візитів від</span>
        <Input type="number" min={0} value={visitCountMin} onChange={(event) => onVisitCountMin(event.target.value)} />
      </label>
      <label className="w-28 space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Візитів до</span>
        <Input type="number" min={0} value={visitCountMax} onChange={(event) => onVisitCountMax(event.target.value)} />
      </label>
      <label className="min-w-[16rem] flex-[2] space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Реєстрація</span>
        <DateRangePicker
          start={registeredFrom}
          end={registeredTo}
          allowPast
          onChange={({ start, end }) => {
            onRegisteredFrom(start)
            if (end) onRegisteredTo(end)
          }}
        />
      </label>
      <label className="min-w-[8rem] space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Сортування</span>
        <Select
          value={sort}
          onValueChange={(value: (typeof SORT_OPTIONS)[number]['value']) => onSort(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="min-w-[8rem] space-y-1.5">
        <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Напрямок</span>
        <Select value={order} onValueChange={(value: 'asc' | 'desc') => onOrder(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">За зростанням</SelectItem>
            <SelectItem value="desc">За спаданням</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <button
        type="button"
        className="h-11 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
        onClick={onClear}
        disabled={!dirty}
      >
        Скинути
      </button>
    </div>
  )
}
