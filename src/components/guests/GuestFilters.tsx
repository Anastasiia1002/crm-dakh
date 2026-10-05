import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GuestBookingCountFilter, GuestCountryFilter, GuestFilters as GuestFilterState, GuestLastBookingFilter, GuestStatus } from '@/types'

const countries: { value: GuestCountryFilter; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: 'Україна', label: 'Україна' },
  { value: 'Румунія', label: 'Румунія' },
  { value: 'Польща', label: 'Польща' },
  { value: 'Німеччина', label: 'Німеччина' },
  { value: 'other', label: 'Інша' },
]

const statuses: { value: 'all' | GuestStatus; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: 'new', label: 'Новий гість' },
  { value: 'regular', label: 'Постійний гість' },
]

const bookingCounts: { value: GuestBookingCountFilter; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: '1', label: '1' },
  { value: '2-5', label: '2–5' },
  { value: '6+', label: '6+' },
]

const lastBookings: { value: GuestLastBookingFilter; label: string }[] = [
  { value: 'any', label: 'Будь-яка дата' },
  { value: '30d', label: 'Останні 30 днів' },
  { value: '3m', label: 'Останні 3 місяці' },
  { value: '1y', label: 'Останній рік' },
]

export function GuestFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: GuestFilterState
  onChange: (patch: Partial<GuestFilterState>) => void
  onClear: () => void
}) {
  const dirty = Boolean(
    filters.search?.trim() ||
      (filters.country && filters.country !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      (filters.bookings && filters.bookings !== 'all') ||
      (filters.lastBooking && filters.lastBooking !== 'any'),
  )

  return (
    <div className="space-y-4">
      <Input
        value={filters.search ?? ''}
        onChange={(event) => onChange({ search: event.target.value, page: 1 })}
        placeholder="Пошук за ім'ям, телефоном або email"
        aria-label="Пошук за ім'ям, телефоном або email"
        className="max-w-xl"
      />
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Країна">
          <Select value={filters.country ?? 'all'} onValueChange={(value) => onChange({ country: value as GuestCountryFilter, page: 1 })}>
            <SelectTrigger className="w-40" aria-label="Країна">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countries.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Статус">
          <Select value={filters.status ?? 'all'} onValueChange={(value) => onChange({ status: value as 'all' | GuestStatus, page: 1 })}>
            <SelectTrigger className="w-48" aria-label="Статус">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Кількість бронювань">
          <Select
            value={filters.bookings ?? 'all'}
            onValueChange={(value) => onChange({ bookings: value as GuestBookingCountFilter, page: 1 })}
          >
            <SelectTrigger className="w-36" aria-label="Кількість бронювань">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bookingCounts.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Останнє бронювання">
          <Select
            value={filters.lastBooking ?? 'any'}
            onValueChange={(value) => onChange({ lastBooking: value as GuestLastBookingFilter, page: 1 })}
          >
            <SelectTrigger className="w-48" aria-label="Останнє бронювання">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lastBookings.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <button
          type="button"
          className="h-10 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
          onClick={onClear}
          disabled={!dirty}
        >
          Очистити фільтри
        </button>
      </div>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">{label}</span>
      {children}
    </label>
  )
}
