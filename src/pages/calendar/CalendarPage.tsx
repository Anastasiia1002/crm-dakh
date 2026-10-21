import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRoomBlocks } from '@/api/accommodations'
import { BlockDatesDialog } from '@/components/accommodations/BlockDatesDialog'
import { BlockDetailsDialog } from '@/components/accommodations/BlockDetailsDialog'
import { Chessboard } from '@/components/calendar/Chessboard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { useAuth } from '@/hooks/useAuth'
import { CALENDAR_WINDOW_DAYS, useAdminCalendarBoard } from '@/hooks/useCalendarBoard'
import { useAdminRooms } from '@/hooks/useHotel'
import {
  emptyNightIntent,
  nextNightSelection,
  showCalendarBlockButton,
  type NightSelection,
} from '@/lib/calendar-selection'
import { addCalendarDays, todayIso } from '@/lib/dates'
import { formatDateShort } from '@/lib/format'
import {
  INVENTORY_ACTIVE_FILTER_LABEL,
  type InventoryActiveFilter,
} from '@/lib/inventory-status'
import { roomTypeKindLabel } from '@/lib/labels'
import type { Accommodation, ChessboardAdminBar, RoomTypeKind } from '@/types'

/**
 * Writers select empty nights, then choose a booking or a block. Other staff still open a one-night booking.
 * Prefill is validated in the booking form; URL params never reserve inventory.
 * Block bars with a blockId open details. "Заблокувати дати" creates a RoomBlock after confirmation.
 */

const kindOptions: { id: RoomTypeKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'ROOM', label: roomTypeKindLabel.ROOM },
  { id: 'COTTAGE', label: roomTypeKindLabel.COTTAGE },
]

export function CalendarPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = showCalendarBlockButton(user?.role)
  const nightIntent = emptyNightIntent(user?.role)
  const [start, setStart] = useState(todayIso())
  const [kind, setKind] = useState<RoomTypeKind | 'all'>('all')
  const [roomTypeId, setRoomTypeId] = useState<string>('all')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryActiveFilter>('active')
  const [blocking, setBlocking] = useState(false)
  const [blockPrefill, setBlockPrefill] = useState<NightSelection | null>(null)
  const [draft, setDraft] = useState<{ roomId: string; startDate: string; endDate: string } | null>(null)
  const [selection, setSelection] = useState<NightSelection | null>(null)
  const [selectionNote, setSelectionNote] = useState<string | null>(null)
  const [inspecting, setInspecting] = useState<{ roomId: string; blockId: string; number: string } | null>(null)

  const board = useAdminCalendarBoard({
    from: start,
    days: CALENDAR_WINDOW_DAYS,
    kind,
    roomTypeId: roomTypeId === 'all' ? undefined : roomTypeId,
    inventoryFilter,
  })
  const roomsQuery = useAdminRooms({ page: 1, limit: 100, active: true })
  const rooms = roomsQuery.data?.items ?? []
  const inspectingBlocks = useQuery({
    queryKey: ['admin-room-blocks', inspecting?.roomId],
    queryFn: ({ signal }) => listRoomBlocks(inspecting!.roomId, signal),
    enabled: Boolean(inspecting?.roomId),
  })
  const inspectingBlock = inspectingBlocks.data?.find((block) => block.id === inspecting?.blockId) ?? null
  const inspectingRoom = inspecting
    ? rooms.find((room) => room.id === inspecting.roomId) ?? {
        id: inspecting.roomId,
        name: null,
        number: inspecting.number,
      }
    : null

  useEffect(() => {
    setSelection(null)
    setSelectionNote(null)
  }, [start, kind, roomTypeId, inventoryFilter])

  const typeOptions = useMemo(() => {
    const types = board.pickerTypesQuery.data ?? []
    if (kind === 'all') return types
    return types.filter((type) => type.kind === kind)
  }, [board.pickerTypesQuery.data, kind])

  const rangeLabel =
    board.model && board.model.dates.length > 0
      ? `${formatDateShort(board.model.dates[0])} — ${formatDateShort(board.model.dates.at(-1) ?? board.model.dates[0])}`
      : ''

  function roomRow(roomId: string) {
    return board.model?.groups.flatMap((group) => group.rooms).find((room) => room.roomId === roomId)
  }

  function availableDates(roomId: string) {
    const nights = roomRow(roomId)?.nights ?? []
    return new Set(nights.filter((night) => night.state === 'AVAILABLE').map((night) => night.date))
  }

  function openBlankBlock() {
    setBlockPrefill(null)
    setBlocking(true)
  }

  function openBlockFromSelection() {
    if (!selection) return
    setBlockPrefill(selection)
    setBlocking(true)
  }

  function createBooking(range: NightSelection) {
    const params = new URLSearchParams({
      roomId: range.roomId,
      checkIn: range.startDate,
      checkOut: range.endDate,
    })
    navigate(`/admin/bookings/new?${params.toString()}`)
  }

  function selectEmptyNight(roomId: string, date: string) {
    if (nightIntent === 'book') {
      createBooking({ roomId, startDate: date, endDate: addCalendarDays(date, 1) })
      return
    }
    const next = nextNightSelection({
      current: selection,
      roomId,
      date,
      availableDates: availableDates(roomId),
    })
    setSelection(next.selection)
    setSelectionNote(next.crossedOccupied ? 'Не можна включити зайняті або заблоковані ночі.' : null)
  }

  const dialogRooms = useMemo(() => {
    const list = [...rooms]
    const roomId = blockPrefill?.roomId
    if (roomId && !list.some((room) => room.id === roomId)) {
      const row = roomRow(roomId)
      if (row) {
        const stub: Accommodation = {
          id: row.roomId,
          roomTypeId: row.roomTypeId,
          number: row.number,
          name: null,
          floor: null,
          status: row.status,
          active: row.active,
          createdAt: '',
          updatedAt: '',
        }
        list.unshift(stub)
      }
    }
    return list
  }, [blockPrefill?.roomId, board.model, rooms])

  function openBlockDetails(bar: ChessboardAdminBar) {
    if (!bar.blockId) return
    const number =
      board.model?.groups.flatMap((group) => group.rooms).find((room) => room.roomId === bar.roomId)?.number ??
      bar.roomId
    setInspecting({ roomId: bar.roomId, blockId: bar.blockId, number })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
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
          {canWrite ? (
            <Button size="sm" className="w-full shrink-0 sm:ml-auto sm:w-auto" onClick={openBlankBlock}>
              Заблокувати дати
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
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
            <SelectTrigger className="w-full sm:w-52">
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
          <Select
            value={inventoryFilter}
            onValueChange={(value: InventoryActiveFilter) => {
              setInventoryFilter(value)
              setRoomTypeId('all')
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(INVENTORY_ACTIVE_FILTER_LABEL) as InventoryActiveFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {INVENTORY_ACTIVE_FILTER_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canWrite && selection ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p>
              {roomRow(selection.roomId)?.number ?? 'Номер'} · {formatDateShort(selection.startDate)} —{' '}
              {formatDateShort(selection.endDate)}
            </p>
            <p className="text-xs text-muted-foreground">Кінець не входить у період. Оберіть дію.</p>
            {selectionNote ? <p className="text-xs text-muted-foreground">{selectionNote}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => createBooking(selection)}>
              Створити бронювання
            </Button>
            <Button size="sm" onClick={openBlockFromSelection}>
              Заблокувати дати
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelection(null)
                setSelectionNote(null)
              }}
            >
              Скасувати
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-background" label="Вільно" />
        <Legend className="bg-status-confirmed" label="Заброньовано" />
        <Legend className="bg-[#f3e6df]" label="Заблоковано" />
        <Legend className="bg-[#d9e4d4]" label="Вибрано" />
        <Legend className="bg-status-pending" label="Очікує підтвердження" />
        <Legend className="bg-status-checked-in" label="Заселено" />
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
          selected={blocking ? draft : selection}
          emptyMode={nightIntent}
          onAdminBar={openBlockDetails}
          onBooking={(bookingId) => navigate(`/admin/bookings/${bookingId}`)}
          onEmpty={selectEmptyNight}
        />
      ) : null}

      <BlockDatesDialog
        open={blocking}
        rooms={dialogRooms}
        selectedRoomId={blockPrefill?.roomId}
        initialStartDate={blockPrefill?.startDate ?? ''}
        initialEndDate={blockPrefill?.endDate ?? ''}
        onOpenChange={(open) => {
          setBlocking(open)
          if (!open) setBlockPrefill(null)
        }}
        onDraftChange={setDraft}
      />
      <BlockDetailsDialog
        open={inspecting !== null}
        room={inspectingRoom}
        block={inspectingBlock}
        onOpenChange={(open) => !open && setInspecting(null)}
      />
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
