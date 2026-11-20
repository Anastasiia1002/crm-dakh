import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listAllRooms, listRoomBlocks } from '@/api/accommodations'
import { BlockDatesDialog } from '@/components/accommodations/BlockDatesDialog'
import { BlockDetailsDialog } from '@/components/accommodations/BlockDetailsDialog'
import { Chessboard } from '@/components/calendar/Chessboard'
import {
  ChessboardStayDialog,
  type ChessboardStayPeek,
} from '@/components/calendar/ChessboardStayDialog'
import { DateRangePicker } from '@/components/dates/DateRangePicker'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { useAuth } from '@/hooks/useAuth'
import { CALENDAR_WINDOW_DAYS, useAdminCalendarBoard } from '@/hooks/useCalendarBoard'
import { useDesktopNav } from '@/hooks/useDesktopNav'
import {
  blockDialogPrefill,
  bookingQueryFromSelection,
  emptyNightIntent,
  nextNightSelection,
  showCalendarBlockButton,
  type NightSelection,
} from '@/lib/calendar-selection'
import {
  chessboardRoomLabel,
  COTTAGE_KIND_GROUP_LABEL,
  ROOM_KIND_GROUP_LABEL,
  unitDisplayLabel,
} from '@/lib/accommodation-labels'
import { chessboardLegend } from '@/lib/chessboard-colors'
import { buildMobileChessboardFixture } from '@/lib/chessboard-mobile-fixture'
import { addCalendarDays, todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/format'
import {
  activeFilterToQuery,
  INVENTORY_ACTIVE_FILTER_LABEL,
  type InventoryActiveFilter,
} from '@/lib/inventory-status'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import type { Accommodation, ChessboardAdminBar, RoomTypeKind } from '@/types'

/**
 * Writers select empty nights, then choose a booking or a block. Other staff still open a one-night booking.
 * Prefill is validated in the booking form; URL params never reserve inventory.
 * Block bars with a blockId open details. "Заблокувати дати" creates a RoomBlock after confirmation.
 */

const kindOptions: { id: RoomTypeKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'ROOM', label: ROOM_KIND_GROUP_LABEL },
  { id: 'COTTAGE', label: COTTAGE_KIND_GROUP_LABEL },
]

export function CalendarPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const desktop = useDesktopNav()
  const compact = !desktop
  const fixture = import.meta.env.DEV && searchParams.get('fixture') === 'mobile'
  const { user } = useAuth()
  const canWrite = showCalendarBlockButton(user?.role)
  const nightIntent = emptyNightIntent(user?.role)
  const [start, setStart] = useState(todayIso())
  const [kind, setKind] = useState<RoomTypeKind | 'all'>('all')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryActiveFilter>('active')
  const [blocking, setBlocking] = useState(false)
  const [dialogSession, setDialogSession] = useState(0)
  const [blockPrefill, setBlockPrefill] = useState<{ roomId: string; startDate: string; endDate: string } | null>(null)
  const [draft, setDraft] = useState<{ roomId: string; startDate: string; endDate: string } | null>(null)
  const [selection, setSelection] = useState<NightSelection | null>(null)
  const [selectionNote, setSelectionNote] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [rangePicking, setRangePicking] = useState(false)
  const [peek, setPeek] = useState<ChessboardStayPeek | null>(null)
  const [inspecting, setInspecting] = useState<{
    roomId: string
    blockId: string
    number: string
    typeName: string | null
  } | null>(null)

  const board = useAdminCalendarBoard({
    from: start,
    days: CALENDAR_WINDOW_DAYS,
    kind,
    inventoryFilter,
  })
  const inventoryActive = activeFilterToQuery(inventoryFilter)
  const roomsQuery = useQuery({
    queryKey: ['admin-rooms-all', { active: inventoryActive }],
    queryFn: ({ signal }) => listAllRooms({ active: inventoryActive }, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const rooms = roomsQuery.data ?? []
  const fixtureBoard = useMemo(
    () => (fixture ? buildMobileChessboardFixture(start) : null),
    [fixture, start],
  )
  const inspectingBlocks = useQuery({
    queryKey: ['admin-room-blocks', inspecting?.roomId],
    queryFn: ({ signal }) => listRoomBlocks(inspecting!.roomId, signal),
    enabled: Boolean(inspecting?.roomId) && !fixture,
  })
  const inspectingBlock =
    fixtureBoard?.blocks.find((block) => block.id === inspecting?.blockId) ??
    inspectingBlocks.data?.find((block) => block.id === inspecting?.blockId) ??
    null
  const inspectingRoom = inspecting
    ? (() => {
        const match = rooms.find((room) => room.id === inspecting.roomId)
        if (match) return { ...match, typeName: inspecting.typeName }
        const row = fixtureBoard?.model.groups.flatMap((group) => group.rooms).find((room) => room.roomId === inspecting.roomId)
        return {
          id: inspecting.roomId,
          name: row?.displayTitle ?? null,
          number: inspecting.number,
          typeName: inspecting.typeName,
        }
      })()
    : null
  const peekBooking = peek
    ? (fixtureBoard?.bookings.find((item) => item.id === peek.bookingId) ??
      board.bookingsQuery.data?.find((item) => item.id === peek.bookingId) ??
      null)
    : null

  useEffect(() => {
    setSelection(null)
    setSelectionNote(null)
  }, [start, kind, inventoryFilter])

  const rangeDates = fixtureBoard?.model.dates ?? board.model?.dates
  const rangeLabel =
    rangeDates && rangeDates.length > 0
      ? `${formatDateShort(rangeDates[0])} — ${formatDateShort(rangeDates.at(-1) ?? rangeDates[0])}`
      : `${formatDateShort(start)} — ${formatDateShort(addCalendarDays(start, CALENDAR_WINDOW_DAYS - 1))}`

  function roomRow(roomId: string) {
    const model = fixtureBoard?.model ?? board.model
    return model?.groups.flatMap((group) => group.rooms).find((room) => room.roomId === roomId)
  }

  function roomLabel(roomId: string) {
    const unit = rooms.find((room) => room.id === roomId)
    const row = roomRow(roomId)
    return unitDisplayLabel(
      { name: unit?.name ?? null, number: unit?.number ?? row?.number ?? '' },
      row?.roomTypeName,
    )
  }

  const boardModel = useMemo(() => {
    const model = board.model
    if (!model) return null
    const byId = new Map(rooms.map((room) => [room.id, room]))
    return {
      ...model,
      groups: model.groups.map((group) => ({
        ...group,
        rooms: group.rooms.map((room) => {
          const unit = byId.get(room.roomId)
          const labeled = chessboardRoomLabel({
            roomId: room.roomId,
            number: room.number,
            name: unit?.name,
            typeName: room.roomTypeName,
          })
          return {
            ...room,
            number: room.number,
            displayTitle: labeled.title,
            displayCode: labeled.code,
          }
        }),
      })),
    }
  }, [board.model, rooms])

  function availableDates(roomId: string) {
    const nights = roomRow(roomId)?.nights ?? []
    return new Set(nights.filter((night) => night.state === 'AVAILABLE').map((night) => night.date))
  }

  function openBlockDialog() {
    setBlockPrefill(blockDialogPrefill({ selection, today: todayIso() }))
    setDialogSession((value) => value + 1)
    setBlocking(true)
  }

  function createBooking(range: NightSelection) {
    const query = bookingQueryFromSelection(range)
    const params = new URLSearchParams({
      roomId: query.roomId,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
    })
    navigate(`/admin/bookings/new?${params.toString()}`)
  }

  function selectEmptyNight(roomId: string, date: string) {
    if (compact && canWrite && !rangePicking) return
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

  function openStay(bookingId: string) {
    if (!compact) {
      navigate(`/admin/bookings/${bookingId}`)
      return
    }
    const bar = (fixtureBoard?.model ?? board.model)?.bookingBars.find((item) => item.bookingId === bookingId)
    setPeek({
      bookingId,
      label: bar?.label ?? '',
      roomLabel: bar ? roomLabel(bar.roomId) : '',
      startDate: bar?.startDate ?? '',
      endDate: bar?.endDate ?? '',
      metadataMissing: bar?.metadataMissing,
    })
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

  const typeNamesByRoomTypeId = useMemo(() => {
    const names = new Map<string, string>()
    for (const group of board.model?.groups ?? []) {
      for (const room of group.rooms) names.set(room.roomTypeId, room.roomTypeName)
    }
    return names
  }, [board.model])

  function openBlockDetails(bar: ChessboardAdminBar) {
    if (!bar.blockId) return
    const row = roomRow(bar.roomId)
    setInspecting({
      roomId: bar.roomId,
      blockId: bar.blockId,
      number: row?.number ?? '',
      typeName: row?.roomTypeName ?? null,
    })
  }

  const periodControls = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'size-9 min-h-9' : undefined}
        aria-label="Попередній період"
        onClick={() => setStart((value) => addCalendarDays(value, -7))}
      >
        {compact ? <ChevronLeft className="size-4" /> : 'Назад'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setStart(todayIso())}>
        Сьогодні
      </Button>
      <Button
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'size-9 min-h-9' : undefined}
        aria-label="Наступний період"
        onClick={() => setStart((value) => addCalendarDays(value, 7))}
      >
        {compact ? <ChevronRight className="size-4" /> : 'Далі'}
      </Button>
      {!compact ? <p className="px-2 text-sm text-muted-foreground">{rangeLabel}</p> : null}
      {!compact && canWrite ? (
        <Button size="sm" className="w-full shrink-0 sm:ml-auto sm:w-auto" onClick={openBlockDialog}>
          Заблокувати дати
        </Button>
      ) : null}
    </div>
  )

  const filterControls = (
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
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Select
        value={inventoryFilter}
        onValueChange={(value: InventoryActiveFilter) => {
          setInventoryFilter(value)
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
      {compact && canWrite ? (
        <Button size="sm" className="w-full sm:w-auto" onClick={openBlockDialog}>
          Заблокувати дати
        </Button>
      ) : null}
    </div>
  )

  const legend = (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <Legend className={chessboardLegend.free} label="Вільно" />
      <Legend className={chessboardLegend.booked} label="Заброньовано" />
      <Legend className={chessboardLegend.blocked} label="Заблоковано" />
      <Legend className={chessboardLegend.selected} label="Вибрано" />
      <Legend className={chessboardLegend.pending} label="Очікує підтвердження" />
      <Legend className={chessboardLegend.occupied} label="Заселено" />
    </div>
  )

  const selectionBar =
    canWrite && selection ? (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p>
            {roomLabel(selection.roomId)} · {formatDateShort(selection.startDate)} —{' '}
            {formatDateShort(selection.endDate)}
          </p>
          <p className="text-xs text-muted-foreground">Кінець не входить у період. Оберіть дію.</p>
          {selectionNote ? <p className="text-xs text-muted-foreground">{selectionNote}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => createBooking(selection)}>
            Створити бронювання
          </Button>
          <Button size="sm" onClick={openBlockDialog}>
            Заблокувати дати
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelection(null)
              setSelectionNote(null)
              setRangePicking(false)
            }}
          >
            Скасувати
          </Button>
        </div>
      </div>
    ) : null

  const boardArea = (
    <>
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

      {!fixture && board.isLoading ? <LoadingState /> : null}

      {!fixture && board.isError ? (
        <div className="space-y-3 border-t border-border py-10">
          <p className="text-sm">Не вдалося завантажити шахівницю</p>
          <Button size="sm" variant="outline" onClick={() => board.refetchAll()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {!fixture && !board.isLoading && !board.isError && board.model && board.model.groups.length === 0 ? (
        <EmptyState>Немає номерів або будиночків за обраними фільтрами.</EmptyState>
      ) : null}

      {(fixtureBoard?.model ??
        (!board.isLoading && !board.isError && board.model && board.model.groups.length > 0
          ? (boardModel ?? board.model)
          : null)) ? (
        <Chessboard
          model={fixtureBoard?.model ?? boardModel ?? board.model!}
          selected={blocking ? draft : selection}
          emptyMode={compact && canWrite ? (rangePicking ? 'select' : 'browse') : nightIntent}
          compact={compact}
          onAdminBar={openBlockDetails}
          onBooking={openStay}
          onEmpty={selectEmptyNight}
        />
      ) : null}
    </>
  )

  return (
    <div className={cn('space-y-5', compact && 'space-y-3')}>
      <PageHeader
        title="Шахматка"
        description="Одиниці зліва, дати зверху. Заброньовані ночі відкривають картку, вільні — створення або блокування."
      />

      {compact ? (
        <div className="sticky top-[var(--admin-header-offset)] z-[21] -mx-4 flex max-h-[calc(100dvh-var(--admin-header-offset))] flex-col gap-2 bg-background px-1">
          <div className="rounded-md border border-border bg-surface p-2">
            {periodControls}
            <div className="mt-2 grid gap-2">
              <p className="text-sm font-medium">{rangeLabel}</p>
              <DateRangePicker
                mode="single"
                start={start}
                onChange={(next) => setStart(next.start)}
                placeholder="Дата"
              />
            </div>
            <div className="mt-2 flex flex-col items-start gap-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Фільтри
                <ChevronDown className={cn('size-4 transition', filtersOpen && 'rotate-180')} />
              </button>
              {filtersOpen ? <div className="w-full">{filterControls}</div> : null}
              {canWrite ? (
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 text-sm',
                    rangePicking ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  aria-pressed={rangePicking}
                  onClick={() => {
                    if (rangePicking) {
                      setRangePicking(false)
                      setSelection(null)
                      setSelectionNote(null)
                      return
                    }
                    setRangePicking(true)
                  }}
                >
                  Обрати період
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                aria-label="Статуси"
                aria-expanded={legendOpen}
                onClick={() => setLegendOpen((open) => !open)}
              >
                Статуси
                <ChevronDown className={cn('size-4 transition', legendOpen && 'rotate-180')} />
              </button>
              {legendOpen ? <div className="w-full">{legend}</div> : null}
            </div>
          </div>
          {selectionBar}
          <div className="flex min-h-0 flex-1 flex-col">{boardArea}</div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
            {periodControls}
            {filterControls}
          </div>
          {selectionBar}
          {legend}
          {boardArea}
        </>
      )}

      <BlockDatesDialog
        key={dialogSession}
        open={blocking}
        rooms={dialogRooms}
        typeNamesByRoomTypeId={typeNamesByRoomTypeId}
        selectedRoomId={blockPrefill?.roomId || undefined}
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
      <ChessboardStayDialog
        open={peek !== null}
        peek={peek}
        booking={peekBooking}
        onOpenChange={(open) => !open && setPeek(null)}
      />
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('size-3 rounded-sm border', className)} />
      {label}
    </span>
  )
}
