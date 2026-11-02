import { useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getRoomType } from '@/api/accommodations'
import { BlockDatesDialog } from '@/components/accommodations/BlockDatesDialog'
import { BlockDetailsDialog } from '@/components/accommodations/BlockDetailsDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useAdminRoomBlocks, useAdminRooms, useAdminRoomTypes, useDeleteAdminRoomBlock } from '@/hooks/useHotel'
import { roomTypeColumnLabel, unitDisplayCode, unitDisplayTitle } from '@/lib/accommodation-labels'
import { isDateInHalfOpenRange, todayIso } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { roomStatusLabel } from '@/lib/labels'
import { blockConflictMessage, blockReasonLabel, unblockConfirmMessage } from '@/lib/room-block'
import {
  INVENTORY_ACTIVE_FILTER_LABEL,
  activeFilterToQuery,
  type InventoryActiveFilter,
} from '@/lib/inventory-status'
import { canManageAccommodations } from '@/lib/roles'
import type { Accommodation, Block, RoomType, RoomTypeKind } from '@/types'

const PAGE_SIZE = 20

export function AccommodationsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'cottages' ? 'cottages' : 'rooms'
  const [unitPage, setUnitPage] = useState(1)
  const [unitSearch, setUnitSearch] = useState('')
  const [unitSearchApplied, setUnitSearchApplied] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryActiveFilter>('active')
  const active = activeFilterToQuery(inventoryFilter)

  const inventoryKind: RoomTypeKind = tab === 'cottages' ? 'COTTAGE' : 'ROOM'

  const roomsQuery = useAdminRooms({
    page: unitPage,
    limit: PAGE_SIZE,
    search: unitSearchApplied || undefined,
    kind: inventoryKind,
    active,
  })
  const typesQuery = useAdminRoomTypes({
    page: 1,
    limit: 100,
    kind: inventoryKind,
    active,
  })

  function onInventoryFilterChange(value: InventoryActiveFilter) {
    setInventoryFilter(value)
    setUnitPage(1)
  }

  const unitsLoading = roomsQuery.isLoading && !roomsQuery.data
  if (unitsLoading) return <LoadingState />

  if (roomsQuery.isError) {
    return (
      <div className="space-y-3 border-t border-border py-10">
        <p className="text-sm">Не вдалося завантажити розміщення</p>
        <Button size="sm" variant="outline" onClick={() => void roomsQuery.refetch()}>
          Спробувати ще раз
        </Button>
      </div>
    )
  }

  const today = todayIso()

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = value === 'cottages' ? 'cottages' : 'rooms'
        const copy = new URLSearchParams(params)
        if (next === 'cottages') copy.set('tab', 'cottages')
        else copy.delete('tab')
        setParams(copy, { replace: true })
        setUnitPage(1)
        setUnitSearch('')
        setUnitSearchApplied('')
      }}
    >
      <TabsList>
        <TabsTrigger value="rooms">Номери</TabsTrigger>
        <TabsTrigger value="cottages">Будиночки</TabsTrigger>
      </TabsList>
      <TabsContent value="rooms">
        {tab === 'rooms' ? (
          <UnitSection
            kind="ROOM"
            items={roomsQuery.data?.items ?? []}
            catalogTypes={typesQuery.data?.items ?? []}
            catalogSettled={typesQuery.isSuccess || typesQuery.isError}
            today={today}
            page={unitPage}
            pageSize={PAGE_SIZE}
            total={roomsQuery.data?.pagination.total ?? 0}
            search={unitSearch}
            inventoryFilter={inventoryFilter}
            onInventoryFilterChange={onInventoryFilterChange}
            onSearchChange={setUnitSearch}
            onSearchSubmit={() => {
              setUnitSearchApplied(unitSearch.trim())
              setUnitPage(1)
            }}
            onPageChange={setUnitPage}
          />
        ) : null}
      </TabsContent>
      <TabsContent value="cottages">
        {tab === 'cottages' ? (
          <UnitSection
            kind="COTTAGE"
            items={roomsQuery.data?.items ?? []}
            catalogTypes={typesQuery.data?.items ?? []}
            catalogSettled={typesQuery.isSuccess || typesQuery.isError}
            today={today}
            page={unitPage}
            pageSize={PAGE_SIZE}
            total={roomsQuery.data?.pagination.total ?? 0}
            search={unitSearch}
            inventoryFilter={inventoryFilter}
            onInventoryFilterChange={onInventoryFilterChange}
            onSearchChange={setUnitSearch}
            onSearchSubmit={() => {
              setUnitSearchApplied(unitSearch.trim())
              setUnitPage(1)
            }}
            onPageChange={setUnitPage}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  )
}

function UnitSection({
  kind,
  items,
  catalogTypes,
  catalogSettled,
  today,
  page,
  pageSize,
  total,
  search,
  inventoryFilter,
  onInventoryFilterChange,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
}: {
  kind: RoomTypeKind
  items: Accommodation[]
  catalogTypes: RoomType[]
  catalogSettled: boolean
  today: string
  page: number
  pageSize: number
  total: number
  search: string
  inventoryFilter: InventoryActiveFilter
  onInventoryFilterChange: (value: InventoryActiveFilter) => void
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onPageChange: (page: number) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const [blocking, setBlocking] = useState<Accommodation | null>(null)
  const [inspecting, setInspecting] = useState<{ room: Accommodation; block: Block } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ room: Accommodation; block: Block } | null>(null)
  const removeBlock = useDeleteAdminRoomBlock()

  const roomIds = items.map((item) => item.id)
  const blockQueries = useAdminRoomBlocks(roomIds)
  const blocksByRoom = useMemo(() => {
    const map = new Map<string, Block[]>()
    roomIds.forEach((id, index) => {
      map.set(id, blockQueries[index]?.data ?? [])
    })
    return map
  }, [blockQueries, roomIds])

  const typeIds = useMemo(
    () => [...new Set(items.map((item) => item.roomTypeId))],
    [items],
  )
  const catalogById = useMemo(() => new Map(catalogTypes.map((type) => [type.id, type])), [catalogTypes])
  const missingTypeIds = catalogSettled ? typeIds.filter((id) => !catalogById.has(id)) : []
  const typeQueries = useQueries({
    queries: missingTypeIds.map((id) => ({
      queryKey: ['admin-room-type', id],
      queryFn: ({ signal }: { signal?: AbortSignal }) => getRoomType(id, signal),
      enabled: Boolean(id),
      staleTime: 5 * 60 * 1000,
    })),
  })
  const typeMetaById = useMemo(() => {
    const map = new Map<string, { name: string; kind: RoomTypeKind; maxGuests: number }>()
    for (const type of catalogTypes) {
      if (typeIds.includes(type.id)) {
        map.set(type.id, { name: type.name, kind: type.kind, maxGuests: type.maxGuests })
      }
    }
    missingTypeIds.forEach((id, index) => {
      const type = typeQueries[index]?.data
      if (type) map.set(id, { name: type.name, kind: type.kind, maxGuests: type.maxGuests })
    })
    return map
  }, [catalogTypes, missingTypeIds, typeIds, typeQueries])

  function openBlock(item: Accommodation) {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setBlocking(item)
  }

  return (
    <div>
      <SectionHeading
        title={kind === 'ROOM' ? 'Номери' : 'Будиночки'}
        action={
          canWrite ? (
            <Button asChild>
              <Link to={`/admin/accommodations/new?kind=${kind}&tab=${kind === 'COTTAGE' ? 'cottages' : 'rooms'}`}>
                {kind === 'ROOM' ? 'Додати номер' : 'Додати будиночок'}
              </Link>
            </Button>
          ) : undefined
        }
      />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Кожен {kind === 'ROOM' ? 'номер' : 'будиночок'} має свою назву, стан і блокування дат. За замовчуванням
        показано лише активні.
      </p>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          className="flex max-w-md flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSearchSubmit()
          }}
        >
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Пошук за номером або назвою"
          />
          <Button type="submit" variant="outline">
            Знайти
          </Button>
        </form>
        <div className="w-full max-w-xs">
          <Field label="Статус">
            <Select
              value={inventoryFilter}
              onValueChange={(value: InventoryActiveFilter) => onInventoryFilterChange(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(INVENTORY_ACTIVE_FILTER_LABEL) as InventoryActiveFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {INVENTORY_ACTIVE_FILTER_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState>
          {kind === 'ROOM' ? 'Номерів за цим запитом немає.' : 'Будиночків за цим запитом немає.'}
        </EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Місткість</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const ownBlocks = blocksByRoom.get(item.id) ?? []
              const state = presence(item, ownBlocks, today)
              const typeMeta = typeMetaById.get(item.roomTypeId)
              const title = unitDisplayTitle(item, typeMeta?.name)
              const code = unitDisplayCode(item, title)
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>{title}</div>
                    {code ? <div className="text-xs text-muted-foreground">{code}</div> : null}
                  </TableCell>
                  <TableCell>{roomTypeColumnLabel(typeMeta?.name, kind)}</TableCell>
                  <TableCell>{typeMeta ? `до ${typeMeta.maxGuests}` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {!item.active ? <Badge tone="neutral">Вимкнений</Badge> : null}
                    </div>
                    {ownBlocks.length > 0 ? (
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {ownBlocks.map((block) => (
                          <div key={block.id} className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="text-left underline-offset-2 hover:underline"
                              onClick={() => setInspecting({ room: item, block })}
                            >
                              {formatDate(block.startDate)} — {formatDate(block.endDate)} · {blockReasonLabel(block)}
                            </button>
                            {canWrite ? (
                              <button
                                type="button"
                                className="underline-offset-2 hover:underline"
                                disabled={removeBlock.isPending}
                                onClick={() => setPendingDelete({ room: item, block })}
                              >
                                Зняти блокування
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite ? (
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/admin/accommodations/${item.id}/edit`}>Редагувати</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openBlock(item)}>
                          Заблокувати дати
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Лише перегляд</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      <BlockDatesDialog
        open={Boolean(blocking)}
        rooms={blocking ? [blocking] : []}
        selectedRoomId={blocking?.id}
        typeNamesByRoomTypeId={new Map([...typeMetaById].map(([id, meta]) => [id, meta.name]))}
        onOpenChange={(open) => !open && setBlocking(null)}
      />
      <BlockDetailsDialog
        open={inspecting !== null}
        room={
          inspecting
            ? { ...inspecting.room, typeName: typeMetaById.get(inspecting.room.roomTypeId)?.name ?? null }
            : null
        }
        block={inspecting?.block ?? null}
        onOpenChange={(open) => !open && setInspecting(null)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Зняти блокування"
        description={
          pendingDelete
            ? unblockConfirmMessage(
                {
                  name: pendingDelete.room.name,
                  number: pendingDelete.room.number,
                  typeName: typeMetaById.get(pendingDelete.room.roomTypeId)?.name,
                },
                pendingDelete.block.startDate,
                pendingDelete.block.endDate,
              )
            : ''
        }
        confirmLabel="Зняти блокування"
        destructive
        pending={removeBlock.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (!pendingDelete) return
          if (!canWrite) {
            toast.error('Недостатньо прав для цієї дії')
            setPendingDelete(null)
            return
          }
          void removeBlock
            .mutateAsync({ roomId: pendingDelete.room.id, blockId: pendingDelete.block.id })
            .then(() => {
              setPendingDelete(null)
              toast.success('Блокування знято')
            })
            .catch((error) => toast.error(blockConflictMessage(error)))
        }}
      />
    </div>
  )
}

function presence(item: Accommodation, blocks: Block[], today: string) {
  const activeBlock = blocks.find((block) => isDateInHalfOpenRange(today, block.startDate, block.endDate))
  if (activeBlock) {
    return {
      label: 'Заблоковано',
      tone: 'cancelled' as const,
    }
  }
  if (item.status === 'AVAILABLE' && item.active) {
    return { label: roomStatusLabel.AVAILABLE, tone: 'neutral' as const }
  }
  if (item.status === 'MAINTENANCE') {
    return { label: roomStatusLabel.MAINTENANCE, tone: 'pending' as const }
  }
  if (item.status === 'OUT_OF_ORDER') {
    return { label: roomStatusLabel.OUT_OF_ORDER, tone: 'cancelled' as const }
  }
  return { label: roomStatusLabel.INACTIVE, tone: 'neutral' as const }
}
