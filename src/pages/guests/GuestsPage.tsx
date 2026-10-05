import { useState } from 'react'
import { GuestExportDialog } from '@/components/guests/GuestExportDialog'
import { GuestFilters } from '@/components/guests/GuestFilters'
import { GuestFormDialog } from '@/components/guests/GuestFormDialog'
import { GuestImportDialog } from '@/components/guests/GuestImportDialog'
import { GuestTable } from '@/components/guests/GuestTable'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { useGuestList } from '@/hooks/useGuestDirectory'
import { formatCount } from '@/lib/format'
import type { Guest, GuestFilters as GuestFilterState } from '@/types'

const initialFilters: GuestFilterState = {
  search: '',
  country: 'all',
  status: 'all',
  bookings: 'all',
  lastBooking: 'any',
  page: 1,
  pageSize: 10,
}

function filtersActive(filters: GuestFilterState) {
  return Boolean(
    filters.search?.trim() ||
      (filters.country && filters.country !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      (filters.bookings && filters.bookings !== 'all') ||
      (filters.lastBooking && filters.lastBooking !== 'any'),
  )
}

export function GuestsPage() {
  const [filters, setFilters] = useState<GuestFilterState>(initialFilters)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [formGuest, setFormGuest] = useState<Guest | 'new' | null>(null)
  const guests = useGuestList(filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-md text-sm text-muted-foreground">База гостей та історія проживань</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            Імпортувати
          </Button>
          <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
            Експортувати
          </Button>
          <Button size="sm" onClick={() => setFormGuest('new')}>
            Додати гостя
          </Button>
        </div>
      </div>

      {guests.data ? <GuestSummary summary={guests.data.summary} /> : null}

      <GuestFilters
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onClear={() => setFilters(initialFilters)}
      />

      {guests.isLoading ? <LoadingState /> : null}
      {guests.isError ? (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">Не вдалося завантажити дані</p>
          <Button size="sm" variant="outline" onClick={() => void guests.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {guests.data && guests.data.summary.totalGuests === 0 && !filtersActive(filters) ? (
        <div className="border-t border-border py-16 text-center">
          <h2 className="font-serif text-3xl font-medium">Гостей поки немає</h2>
          <p className="mt-2 text-sm text-muted-foreground">Додайте першого гостя або імпортуйте список клієнтів.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => setFormGuest('new')}>
              Додати гостя
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              Імпортувати список
            </Button>
          </div>
        </div>
      ) : null}

      {guests.data && (guests.data.summary.totalGuests > 0 || filtersActive(filters)) ? (
        guests.data.items.length === 0 ? (
          <EmptyState>За цими фільтрами гостей немає.</EmptyState>
        ) : (
          <>
            <GuestTable guests={guests.data.items} onEdit={(guest) => setFormGuest(guest)} />
            <Pagination
              page={guests.data.page}
              pageSize={guests.data.pageSize}
              total={guests.data.total}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            />
          </>
        )
      ) : null}

      <GuestImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <GuestExportDialog open={exportOpen} filters={filters} onOpenChange={setExportOpen} />
      <GuestFormDialog
        open={formGuest !== null}
        guest={formGuest && formGuest !== 'new' ? formGuest : undefined}
        onOpenChange={(open) => {
          if (!open) setFormGuest(null)
        }}
      />
    </div>
  )
}

function GuestSummary({
  summary,
}: {
  summary: { totalGuests: number; newGuests: number; withBookings: number; returningGuests: number }
}) {
  const items = [
    { label: 'Усього гостей', value: formatCount(summary.totalGuests) },
    { label: 'Нові гості', value: `+${formatCount(summary.newGuests)}` },
    { label: 'Гості з бронюваннями', value: formatCount(summary.withBookings) },
    { label: 'Повторні гості', value: formatCount(summary.returningGuests) },
  ]

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 font-serif text-[1.7rem] leading-none tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
