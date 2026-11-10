import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GuestExportDialog } from '@/components/guests/GuestExportDialog'
import { GuestFilters } from '@/components/guests/GuestFilters'
import { GuestFormDialog } from '@/components/guests/GuestFormDialog'
import { GuestTable } from '@/components/guests/GuestTable'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { useAuth } from '@/hooks/useAuth'
import { useExportGuests, useGuestList } from '@/hooks/useGuestDirectory'
import { LAST_VISIT_FILTERS, type GuestDirectoryQuery, type LastVisitFilter, guestFailure, guestFailureMessage } from '@/lib/admin-guests'
import { formatCount } from '@/lib/format'
import { canExportGuests, canWriteGuests } from '@/lib/roles'

const SORTS = ['fullName', 'phone', 'visitCount', 'lastVisit', 'createdAt'] as const
type DirectorySort = (typeof SORTS)[number]

const PAGE_SIZE = 20

function isLastVisit(value: string | null): value is LastVisitFilter {
  return LAST_VISIT_FILTERS.some((entry) => entry === value)
}

function isSort(value: string | null): value is DirectorySort {
  return SORTS.some((entry) => entry === value)
}

export function GuestsPage() {
  const { user } = useAuth()
  const canWrite = canWriteGuests(user?.role)
  const canExport = canExportGuests(user?.role)
  const [params, setParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const exporter = useExportGuests()

  const search = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const lastVisitParam = params.get('lastVisit')
  const lastVisitFilter: LastVisitFilter = isLastVisit(lastVisitParam) ? lastVisitParam : 'all'
  const visitCountMin = params.get('visitMin') ?? ''
  const visitCountMax = params.get('visitMax') ?? ''
  const registeredFrom = params.get('from') ?? ''
  const registeredTo = params.get('to') ?? ''
  const sortParam = params.get('sort')
  const sort: DirectorySort = isSort(sortParam) ? sortParam : 'fullName'
  const order: 'asc' | 'desc' = params.get('order') === 'desc' ? 'desc' : 'asc'

  const query: GuestDirectoryQuery = useMemo(() => {
    const next: GuestDirectoryQuery = { page, limit: PAGE_SIZE, lastVisit: lastVisitFilter, sort, order }
    if (search.trim()) next.search = search
    if (visitCountMin !== '') next.visitCountMin = Number(visitCountMin)
    if (visitCountMax !== '') next.visitCountMax = Number(visitCountMax)
    if (registeredFrom) next.registeredFrom = registeredFrom
    if (registeredTo) next.registeredTo = registeredTo
    return next
  }, [page, search, lastVisitFilter, visitCountMin, visitCountMax, registeredFrom, registeredTo, sort, order])

  const guests = useGuestList(query)
  const failure = guests.isError ? guestFailure(guests.error) : null

  function patch(next: Record<string, string | null>) {
    const copy = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '' || value === 'all' || value === '1') {
        if (key === 'page' && value === '1') copy.delete('page')
        else if (value === 'all' || value === '' || value === null) copy.delete(key)
        else copy.set(key, value)
      } else copy.set(key, value)
    }
    if (!('page' in next)) copy.delete('page')
    setParams(copy, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">Ваша клієнтська база тут</p>
        <div className="flex flex-wrap gap-2">
          {canExport ? (
            <Button type="button" variant="outline" onClick={() => setExportOpen(true)}>
              Експорт
            </Button>
          ) : null}
          {canWrite ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Додати клієнта
            </Button>
          ) : null}
        </div>
      </div>

      <GuestFilters
        search={search}
        lastVisit={lastVisitFilter}
        visitCountMin={visitCountMin}
        visitCountMax={visitCountMax}
        registeredFrom={registeredFrom}
        registeredTo={registeredTo}
        sort={sort}
        order={order}
        onSearch={(value) => patch({ q: value })}
        onLastVisit={(value) => patch({ lastVisit: value })}
        onVisitCountMin={(value) => patch({ visitMin: value })}
        onVisitCountMax={(value) => patch({ visitMax: value })}
        onRegisteredFrom={(value) => patch({ from: value })}
        onRegisteredTo={(value) => patch({ to: value })}
        onSort={(value) => patch({ sort: value === 'fullName' ? null : value })}
        onOrder={(value) => patch({ order: value === 'asc' ? null : value })}
        onClear={() => setParams(new URLSearchParams(), { replace: true })}
      />

      {guests.data ? (
        <dl className="border-y border-border py-4">
          <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">
            {search.trim() || lastVisitFilter !== 'all' ? 'Знайдено' : 'Усього клієнтів'}
          </dt>
          <dd className="mt-1 font-serif text-[1.7rem] leading-none tabular-nums">{formatCount(guests.data.total)}</dd>
        </dl>
      ) : null}

      {guests.isLoading ? <LoadingState /> : null}
      {failure ? (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">{guestFailureMessage(failure)}</p>
          <Button size="sm" variant="outline" onClick={() => void guests.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {guests.data && guests.data.total === 0 && !search.trim() && lastVisitFilter === 'all' ? (
        <div className="border-t border-border py-16 text-center">
          <h2 className="font-serif text-3xl font-medium">Клієнтів поки немає</h2>
          <p className="mt-2 text-sm text-muted-foreground">Додайте картку або дочекайтеся першого бронювання.</p>
        </div>
      ) : null}

      {guests.data && (guests.data.total > 0 || search.trim() || lastVisitFilter !== 'all') ? (
        guests.data.items.length === 0 ? (
          <EmptyState>За цим пошуком і фільтрами клієнтів немає.</EmptyState>
        ) : (
          <>
            <GuestTable guests={guests.data.items} />
            <Pagination
              page={guests.data.page}
              pageSize={guests.data.limit}
              total={guests.data.total}
              onPageChange={(next) => {
                const copy = new URLSearchParams(params)
                if (next <= 1) copy.delete('page')
                else copy.set('page', String(next))
                setParams(copy, { replace: true })
              }}
            />
          </>
        )
      ) : null}

      {canWrite ? <GuestFormDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}
      <GuestExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        pending={exporter.isPending}
        onExport={(format) => {
          void exporter.mutateAsync({ query, format }).then(() => setExportOpen(false))
        }}
      />
    </div>
  )
}
