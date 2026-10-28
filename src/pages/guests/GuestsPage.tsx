import { useDeferredValue, useState } from 'react'
import { GuestFilters } from '@/components/guests/GuestFilters'
import { GuestTable } from '@/components/guests/GuestTable'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { useGuestList } from '@/hooks/useGuestDirectory'
import { guestFailure, guestFailureMessage } from '@/lib/admin-guests'
import { formatCount } from '@/lib/format'

const PAGE_SIZE = 20

export function GuestsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)
  const guests = useGuestList({ page, limit: PAGE_SIZE, search: deferredSearch })
  const failure = guests.isError ? guestFailure(guests.error) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Гості цього готелю з бронювань, включно з сайтом. Додавання, редагування, імпорт і експорт тут недоступні.
        </p>
      </div>

      {guests.data ? (
        <dl className="border-y border-border py-4">
          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">
            {deferredSearch.trim() ? 'Знайдено' : 'Усього гостей'}
          </dt>
          <dd className="mt-1 font-serif text-[1.7rem] leading-none tabular-nums">{formatCount(guests.data.total)}</dd>
        </dl>
      ) : null}

      <GuestFilters
        search={search}
        onSearch={(value) => {
          setSearch(value)
          setPage(1)
        }}
        onClear={() => {
          setSearch('')
          setPage(1)
        }}
      />

      {guests.isLoading ? <LoadingState /> : null}
      {failure ? (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">{guestFailureMessage(failure)}</p>
          <Button size="sm" variant="outline" onClick={() => void guests.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {guests.data && guests.data.total === 0 && !deferredSearch.trim() ? (
        <div className="border-t border-border py-16 text-center">
          <h2 className="font-serif text-3xl font-medium">Гостей поки немає</h2>
          <p className="mt-2 text-sm text-muted-foreground">Вони з’являться після першого бронювання.</p>
        </div>
      ) : null}

      {guests.data && (guests.data.total > 0 || deferredSearch.trim()) ? (
        guests.data.items.length === 0 ? (
          <EmptyState>За цим пошуком гостей немає.</EmptyState>
        ) : (
          <>
            <GuestTable guests={guests.data.items} />
            <Pagination page={guests.data.page} pageSize={guests.data.limit} total={guests.data.total} onPageChange={setPage} />
          </>
        )
      ) : null}
    </div>
  )
}
