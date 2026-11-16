import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminRoomHistory } from '@/hooks/useHotel'
import { formatDateShort } from '@/lib/format'
import { roomBlockTypeLabel } from '@/lib/labels'
import { hasPermission } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import type { BookingStatus } from '@/types'

const PAGE_SIZE = 20

export function UnitHistory({ roomId }: { roomId: string }) {
  const { user } = useAuth()
  const canOpenBooking = hasPermission(user?.role, 'bookings.read')
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const history = useAdminRoomHistory(roomId, {
    page,
    limit: PAGE_SIZE,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <section className="space-y-4">
      <SectionHeading title="Історія" />
      <p className="text-sm text-muted-foreground">
        Показано бронювання з поточним призначенням цього розміщення та збережені закриті дати. Видалені блокування
        та попередні призначення кімнати в журналі не зберігаються.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Від</span>
          <Input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(1)
            }}
            className="w-40"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">До</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(1)
            }}
            className="w-40"
          />
        </label>
      </div>
      {history.isError ? (
        <div className="space-y-2">
          <p className="text-sm">Не вдалося завантажити історію.</p>
          <Button size="sm" variant="outline" onClick={() => void history.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}
      {!history.isError && (history.data?.items.length ?? 0) === 0 ? (
        <EmptyState>Записів історії немає.</EmptyState>
      ) : null}
      {(history.data?.items.length ?? 0) > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Тип</TableHead>
                <TableHead>Дати</TableHead>
                <TableHead>Деталі</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data?.items.map((item) => (
                <TableRow key={`${item.kind}-${item.id}`}>
                  <TableCell>{item.kind === 'booking' ? 'Бронювання' : 'Закриті дати'}</TableCell>
                  <TableCell>
                    {formatDateShort(item.startDate)}–{formatDateShort(item.endDate)}
                  </TableCell>
                  <TableCell>
                    {item.kind === 'booking' ? (
                      canOpenBooking && item.bookingId ? (
                        <Link className="underline underline-offset-4" to={`/admin/bookings/${item.bookingId}`}>
                          {item.guestName ?? 'Бронювання'}
                        </Link>
                      ) : (
                        (item.guestName ?? 'Бронювання')
                      )
                    ) : (
                      [item.blockType ? roomBlockTypeLabel[item.blockType] : null, item.reason].filter(Boolean).join(' · ') ||
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.kind === 'booking' && item.status ? (
                      <BookingStatusBadge status={item.status as BookingStatus} />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={history.data?.pagination.total ?? 0}
        onPageChange={setPage}
      />
      {history.data ? (
        <p className="text-xs text-muted-foreground">
          Видалені блокування зберігаються: {history.data.retention.deletedBlocksRetained ? 'так' : 'ні'}. Попередні
          призначення кімнати зберігаються:{' '}
          {history.data.retention.priorAssignmentsRetained ? 'так' : 'ні'}.
        </p>
      ) : null}
    </section>
  )
}
