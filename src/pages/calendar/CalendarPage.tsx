import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chessboard } from '@/components/calendar/Chessboard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { CALENDAR_WINDOW_DAYS, useAdminCalendarBoard } from '@/hooks/useCalendarBoard'
import { addCalendarDays, todayIso } from '@/lib/dates'
import { formatDateShort } from '@/lib/format'
import { roomTypeKindLabel } from '@/lib/labels'
import type { RoomTypeKind } from '@/types'

/**
 * Phase 6 prefill contract (not applied by the current mock booking form):
 * - roomId: physical Room UUID from availability calendar
 * - checkIn: YYYY-MM-DD stay start
 * - checkOut: optional half-open end date
 *
 * Until Bookings API integration, empty-cell navigation only passes checkIn
 * (supported by the mock form) and does not pass roomId/accommodationId.
 */

const kindOptions: { id: RoomTypeKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'ROOM', label: roomTypeKindLabel.ROOM },
  { id: 'COTTAGE', label: roomTypeKindLabel.COTTAGE },
]

export function CalendarPage() {
  const navigate = useNavigate()
  const [start, setStart] = useState(todayIso())
  const [kind, setKind] = useState<RoomTypeKind | 'all'>('all')
  const [roomTypeId, setRoomTypeId] = useState<string>('all')

  const board = useAdminCalendarBoard({
    from: start,
    days: CALENDAR_WINDOW_DAYS,
    kind,
    roomTypeId: roomTypeId === 'all' ? undefined : roomTypeId,
  })

  const typeOptions = useMemo(() => {
    return board.pickerTypesQuery.data ?? []
  }, [board.pickerTypesQuery.data])

  const rangeLabel =
    board.model && board.model.dates.length > 0
      ? `${formatDateShort(board.model.dates[0])} — ${formatDateShort(board.model.dates.at(-1) ?? board.model.dates[0])}`
      : ''

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStart((value) => addCalendarDays(value, -7))}
          >
            Назад
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(todayIso())}>
            Сьогодні
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStart((value) => addCalendarDays(value, 7))}
          >
            Далі
          </Button>
          <p className="px-2 text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {kindOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  kind === item.id
                    ? 'border-foreground bg-primary text-primary-foreground'
                    : 'border-border bg-surface'
                }`}
                onClick={() => {
                  setKind(item.id)
                  setRoomTypeId('all')
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Select value={roomTypeId} onValueChange={(value) => setRoomTypeId(value)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Категорія" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі категорії</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-status-pending" label="Очікує підтвердження" />
        <Legend className="bg-status-confirmed" label="Підтверджено" />
        <Legend className="bg-status-checked-in" label="Заселено" />
        <Legend className="bg-[#f3e6df]" label="Блок / обслуговування" />
      </div>

      {board.enrichmentFailed || board.enrichmentIncomplete || board.typesIncomplete ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            {board.enrichmentFailed
              ? 'Не вдалося завантажити деталі бронювань. Зайнятість номерів збережено з календаря доступності.'
              : board.typesIncomplete
                ? 'Для деяких категорій не вдалося визначити тип (номер/будиночок). Інвентар показано без фільтрації за типом.'
                : 'Деякі бронювання зайнятості не знайдені у списку. Зайнятість номерів збережено.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => board.refetchAll()}>
            Оновити
          </Button>
        </div>
      ) : null}

      {board.isLoading ? <LoadingState /> : null}

      {board.isError ? (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">Не вдалося завантажити шахівницю</p>
          <Button size="sm" variant="outline" onClick={() => board.refetchAll()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {!board.isLoading && !board.isError && board.model && board.model.groups.length === 0 ? (
        <EmptyState>Немає номерів або будиночків за обраними фільтрами.</EmptyState>
      ) : null}

      {!board.isLoading && !board.isError && board.model && board.model.groups.length > 0 ? (
        <Chessboard
          model={board.model}
          onBooking={(bookingId) => navigate(`/admin/bookings/${bookingId}`)}
          onEmpty={(_roomId, date) => {
            // Mock booking form only safely consumes checkIn today.
            // Phase 6: also pass roomId=<physical Room UUID>.
            navigate(`/admin/bookings/new?checkIn=${encodeURIComponent(date)}`)
          }}
        />
      ) : null}
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-3 rounded-sm border border-border ${className}`} />
      {label}
    </span>
  )
}
