import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getRoomType } from '@/api/accommodations'
import { BlockDatesDialog } from '@/components/accommodations/BlockDatesDialog'
import { BlockDetailsDialog } from '@/components/accommodations/BlockDetailsDialog'
import { RoomTypePicker } from '@/components/accommodations/RoomTypePicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminRoomBlocks,
  useAdminRoomType,
  useAdminRooms,
  useAdminRoomTypeImages,
  useAdminRoomTypes,
  useCreateAdminRoom,
  useCreateAdminRoomTypeImage,
  useDeleteAdminRoomBlock,
  useDeleteAdminRoomTypeImage,
  useReorderAdminRoomTypeImages,
  useUpdateAdminRoom,
  useUpdateAdminRoomType,
  useUpdateAdminRoomTypeImage,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { roomTypeColumnLabel, sharedRoomTypeNotice, unitDisplayCode, unitDisplayTitle } from '@/lib/accommodation-labels'
import { isDateInHalfOpenRange, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { roomStatusLabel, roomTypeKindLabel } from '@/lib/labels'
import { blockConflictMessage, blockReasonLabel, unblockConfirmMessage } from '@/lib/room-block'
import {
  INVENTORY_ACTIVE_FILTER_LABEL,
  activeFilterToQuery,
  type InventoryActiveFilter,
} from '@/lib/inventory-status'
import { canManageAccommodations } from '@/lib/roles'
import type {
  Accommodation,
  Block,
  RoomStatus,
  RoomType,
  RoomTypeImage,
  RoomTypeKind,
} from '@/types'

const PAGE_SIZE = 20
const ROOM_STATUSES = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_ORDER', 'INACTIVE'] as const

export function AccommodationsPage() {
  const [tab, setTab] = useState<'rooms' | 'cottages'>('rooms')
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
        const next = value as 'rooms' | 'cottages'
        setTab(next)
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
  const [editing, setEditing] = useState<Accommodation | null | 'new'>(null)
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

  function openCreate() {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setEditing('new')
  }

  function openEdit(item: Accommodation) {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setEditing(item)
  }

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
            <Button onClick={openCreate}>
              {kind === 'ROOM' ? 'Додати номер' : 'Додати будиночок'}
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
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          Редагувати
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
      <UnitDialog
        open={editing !== null}
        kind={kind}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
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

const unitSchema = z.object({
  name: z.string().max(200, 'Назва задовга'),
  number: z.string().trim().min(1, 'Вкажіть номер').max(50, 'Номер задовгий'),
  roomTypeId: z.string().min(1, 'Оберіть тип розміщення'),
  floor: z.string(),
  status: z.enum(ROOM_STATUSES),
  active: z.enum(['yes', 'no']),
})

function UnitDialog({
  open,
  kind,
  item,
  onOpenChange,
}: {
  open: boolean
  kind: RoomTypeKind
  item?: Accommodation
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const create = useCreateAdminRoom()
  const update = useUpdateAdminRoom()
  const updateType = useUpdateAdminRoomType()
  const pending = create.isPending || update.isPending || updateType.isPending
  const assignedType = useAdminRoomType(item?.roomTypeId)
  const sharedUnits = useAdminRooms(
    { page: 1, limit: 1, roomTypeId: item?.roomTypeId },
    { enabled: Boolean(item?.roomTypeId) },
  )
  const sharedUnitCount = sharedUnits.isSuccess ? sharedUnits.data.pagination.total : null
  const [guestName, setGuestName] = useState('')
  const [description, setDescription] = useState('')
  const [maxGuests, setMaxGuests] = useState('2')
  const [typeError, setTypeError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    values: {
      name: item?.name ?? '',
      number: item?.number ?? '',
      roomTypeId: item?.roomTypeId ?? '',
      floor: item?.floor != null ? String(item.floor) : '',
      status: item?.status ?? 'AVAILABLE',
      active: item?.active === false ? 'no' : 'yes',
    },
  })
  const selectedTypeId = form.watch('roomTypeId')
  const selectedType = useAdminRoomType(!item ? selectedTypeId || undefined : undefined)
  const categoryPending = !item && Boolean(selectedTypeId) && (selectedType.isLoading || selectedType.isFetching)
  const kindMismatch = Boolean(!item && selectedType.data && selectedType.data.kind !== kind)
  const categoryMissing = Boolean(!item && selectedTypeId && !categoryPending && !selectedType.data)
  const createTypeReady =
    Boolean(selectedTypeId) && !categoryPending && !kindMismatch && !categoryMissing

  const loadedTypeId = assignedType.data?.id
  useEffect(() => {
    if (!open || !item || !assignedType.data || assignedType.data.id !== item.roomTypeId) return
    setGuestName(assignedType.data.name)
    setDescription(assignedType.data.description ?? '')
    setMaxGuests(String(assignedType.data.maxGuests))
    setTypeError(null)
    // Reload guest fields when this unit's type arrives or the dialog opens again.
    // A later refetch of the same type must not wipe text the administrator is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, item?.roomTypeId, loadedTypeId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {item
              ? kind === 'ROOM'
                ? 'Редагувати номер'
                : 'Редагувати будиночок'
              : kind === 'ROOM'
                ? 'Новий номер'
                : 'Новий будиночок'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            if (!item && !createTypeReady) {
              form.setError('roomTypeId', {
                message: `Оберіть тип «${roomTypeKindLabel[kind]}»`,
              })
              return
            }
            const floorTrimmed = values.floor.trim()
            let floorValue: number | null = null
            if (floorTrimmed !== '') {
              const parsed = Number(floorTrimmed)
              if (!Number.isInteger(parsed)) {
                form.setError('floor', { message: 'Поверх має бути цілим числом' })
                return
              }
              floorValue = parsed
            }
            const type = item ? assignedType.data : undefined
            let guests = type?.maxGuests
            let nextDescription = type?.description ?? null
            let nextGuestName = type?.name
            if (item && type) {
              guests = Number(maxGuests)
              if (!Number.isInteger(guests) || guests < 1) {
                setTypeError('Місткість має бути цілим числом від 1')
                return
              }
              if (!guestName.trim()) {
                setTypeError('Вкажіть назву для гостей')
                return
              }
              if (guestName.trim().length > 200) {
                setTypeError('Назва для гостей задовга')
                return
              }
              if (description.length > 4000) {
                setTypeError('Опис задовгий')
                return
              }
              nextGuestName = guestName.trim()
              nextDescription = description.trim() ? description.trim() : null
              setTypeError(null)
            }
            try {
              const payload = {
                name: values.name.trim() ? values.name.trim() : null,
                number: values.number,
                roomTypeId: item?.roomTypeId ?? values.roomTypeId,
                floor: floorValue,
                status: values.status,
                active: values.active === 'yes',
              }
              if (item) {
                await update.mutateAsync({ id: item.id, input: payload })
                if (
                  type &&
                  nextGuestName &&
                  guests !== undefined &&
                  (nextGuestName !== type.name ||
                    nextDescription !== (type.description ?? null) ||
                    guests !== type.maxGuests)
                ) {
                  await updateType.mutateAsync({
                    id: type.id,
                    input: {
                      name: nextGuestName,
                      description: nextDescription,
                      maxGuests: guests,
                    },
                  })
                }
              } else {
                await create.mutateAsync(payload)
              }
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(accommodationErrorMessage(error))
            }
          })}
        >
          <Field label="Назва" hint="Як одиницю видно в CRM">
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <Field label="Номер / код" error={form.formState.errors.number?.message}>
            <Input disabled={!canWrite} {...form.register('number')} />
          </Field>
          {item ? (
            <>
              <p className="text-xs text-muted-foreground">{sharedRoomTypeNotice(sharedUnitCount)}</p>
              <Field label="Назва для гостей" hint="Спільна для всіх розміщень цього типу">
                <Input
                  disabled={!canWrite || !assignedType.data}
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
              </Field>
              <Field label="Опис" hint="Спільний для всіх розміщень цього типу">
                <Textarea
                  disabled={!canWrite || !assignedType.data}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Field label="Місткість" hint="Спільний максимум гостей для всіх розміщень цього типу">
                <Input
                  type="number"
                  min={1}
                  disabled={!canWrite || !assignedType.data}
                  value={maxGuests}
                  onChange={(event) => setMaxGuests(event.target.value)}
                />
              </Field>
              {typeError ? <p className="text-sm text-destructive">{typeError}</p> : null}
              {assignedType.isError ? (
                <p className="text-sm text-muted-foreground">
                  Не вдалося завантажити опис і місткість. Назву, номер і стан усе одно можна зберегти.
                </p>
              ) : null}
              {assignedType.data ? <ImageManager roomTypeId={assignedType.data.id} canWrite={canWrite} /> : null}
            </>
          ) : (
            <Field label="Тип розміщення" error={form.formState.errors.roomTypeId?.message}>
              <RoomTypePicker
                value={form.watch('roomTypeId')}
                kind={kind}
                activeOnly
                disabled={!canWrite}
                onChange={(value) => form.setValue('roomTypeId', value, { shouldValidate: true })}
              />
            </Field>
          )}
          <Field label="Поверх" error={form.formState.errors.floor?.message} hint="Необовʼязково">
            <Input type="number" disabled={!canWrite} {...form.register('floor')} />
          </Field>
          <Field label="Статус">
            <Select
              value={form.watch('status')}
              onValueChange={(value: RoomStatus) => form.setValue('status', value)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {roomStatusLabel[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Активність">
            <Select
              value={form.watch('active')}
              onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активний</SelectItem>
                <SelectItem value="no">Вимкнений</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canWrite || pending || (!item && !createTypeReady) || Boolean(item && assignedType.isLoading)}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const imageSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Вкажіть коректну URL-адресу')
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'Має бути http або https адреса',
    }),
  alt: z.string().max(300, 'Alt задовгий'),
})

function ImageManager({ roomTypeId, canWrite }: { roomTypeId: string; canWrite: boolean }) {
  const images = useAdminRoomTypeImages(roomTypeId)
  const create = useCreateAdminRoomTypeImage()
  const update = useUpdateAdminRoomTypeImage()
  const reorder = useReorderAdminRoomTypeImages()
  const remove = useDeleteAdminRoomTypeImage()
  const [pendingDelete, setPendingDelete] = useState<RoomTypeImage | null>(null)
  const [editingImage, setEditingImage] = useState<RoomTypeImage | null>(null)
  const form = useForm<z.infer<typeof imageSchema>>({
    resolver: zodResolver(imageSchema),
    defaultValues: { url: '', alt: '' },
  })
  const editForm = useForm<z.infer<typeof imageSchema>>({
    resolver: zodResolver(imageSchema),
    values: {
      url: editingImage?.url ?? '',
      alt: editingImage?.alt ?? '',
    },
  })

  const items = useMemo(() => {
    const list = [...(images.data ?? [])]
    return list.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
      return left.id.localeCompare(right.id)
    })
  }, [images.data])

  async function move(imageId: string, direction: -1 | 1) {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    const index = items.findIndex((item) => item.id === imageId)
    const next = index + direction
    if (index < 0 || next < 0 || next >= items.length) return
    const ordered = items.map((item) => item.id)
    ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
    try {
      await reorder.mutateAsync({ roomTypeId, imageIds: ordered })
      toast.success('Порядок оновлено')
    } catch (error) {
      toast.error(accommodationErrorMessage(error))
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-medium">Зображення</h3>
        <p className="text-xs text-muted-foreground">
          Зберігаються лише HTTP(S) URL-записи. Завантаження файлів і cover-прапорець у backend відсутні.
        </p>
      </div>
      {images.isLoading ? <p className="text-sm text-muted-foreground">Завантаження…</p> : null}
      {images.isError ? (
        <div className="space-y-2">
          <p className="text-sm">Не вдалося завантажити зображення</p>
          <Button size="sm" variant="outline" onClick={() => void images.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}
      {items.length === 0 && !images.isLoading ? (
        <p className="text-sm text-muted-foreground">Зображень ще немає.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((image, index) => (
            <li key={image.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                {isSafeHttpUrl(image.url) ? (
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline-offset-2 hover:underline"
                  >
                    {image.url}
                  </a>
                ) : (
                  <span className="break-all text-destructive">Некоректний URL</span>
                )}
                <div className="text-xs text-muted-foreground">
                  {image.alt ?? 'Без alt'} · порядок {image.sortOrder}
                </div>
              </div>
              {canWrite ? (
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => void move(image.id, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={index === items.length - 1 || reorder.isPending}
                    onClick={() => void move(image.id, 1)}
                  >
                    ↓
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingImage(image)}>
                    Змінити
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDelete(image)}>
                    Видалити
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await create.mutateAsync({
                roomTypeId,
                input: {
                  url: values.url,
                  alt: values.alt.trim() ? values.alt.trim() : null,
                },
              })
              form.reset({ url: '', alt: '' })
              toast.success('Зображення додано')
            } catch (error) {
              toast.error(accommodationErrorMessage(error))
            }
          })}
        >
          <Field label="URL зображення" error={form.formState.errors.url?.message}>
            <Input {...form.register('url')} placeholder="https://…" />
          </Field>
          <Field label="Alt" error={form.formState.errors.alt?.message}>
            <Input {...form.register('alt')} />
          </Field>
          <Button type="submit" size="sm" disabled={create.isPending}>
            Додати URL
          </Button>
        </form>
      ) : null}

      <Dialog
        open={editingImage !== null}
        onOpenChange={(open) => {
          if (!open) setEditingImage(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редагувати зображення</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit(async (values) => {
              if (!editingImage) return
              if (!canWrite) {
                toast.error('Недостатньо прав для цієї дії')
                return
              }
              try {
                await update.mutateAsync({
                  roomTypeId,
                  imageId: editingImage.id,
                  input: {
                    url: values.url,
                    alt: values.alt.trim() ? values.alt.trim() : null,
                  },
                })
                toast.success('Зображення оновлено')
                setEditingImage(null)
              } catch (error) {
                toast.error(accommodationErrorMessage(error))
              }
            })}
          >
            <Field label="URL" error={editForm.formState.errors.url?.message}>
              <Input {...editForm.register('url')} />
            </Field>
            <Field label="Alt" error={editForm.formState.errors.alt?.message}>
              <Input {...editForm.register('alt')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingImage(null)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={update.isPending}>
                Зберегти
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити зображення?"
        description={pendingDelete?.url ?? ''}
        confirmLabel="Видалити"
        destructive
        pending={remove.isPending}
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
          void remove
            .mutateAsync({ roomTypeId, imageId: pendingDelete.id })
            .then(() => {
              setPendingDelete(null)
              toast.success('Зображення видалено')
            })
            .catch((error) => toast.error(accommodationErrorMessage(error)))
        }}
      />
    </div>
  )
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function accommodationErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return errorMessage(error)
  if (error.status === 403) return 'Недостатньо прав для цієї дії'
  if (error.status === 404) return error.message || 'Запис не знайдено'
  if (error.status === 409) {
    if (error.code === 'ROOM_TYPE_SLUG_EXISTS') return 'Така назва вже використовується'
    if (error.code === 'ROOM_NUMBER_EXISTS') return 'Такий номер уже існує'
    if (error.code === 'ROOM_BLOCK_OVERLAP' || error.code === 'ACTIVE_BOOKING_OVERLAP') {
      return blockConflictMessage(error)
    }
    return error.message
  }
  if (error.details?.length) return error.details.join('. ')
  return error.message || errorMessage(error)
}
