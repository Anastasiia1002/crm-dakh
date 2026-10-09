import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getRoomType } from '@/api/accommodations'
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
  useCreateAdminRoomBlock,
  useCreateAdminRoomType,
  useCreateAdminRoomTypeImage,
  useDeleteAdminRoomBlock,
  useDeleteAdminRoomTypeImage,
  useReorderAdminRoomTypeImages,
  useUpdateAdminRoom,
  useUpdateAdminRoomType,
  useUpdateAdminRoomTypeImage,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { isDateInHalfOpenRange, roomDisplayName, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { roomBlockTypeLabel, roomStatusLabel } from '@/lib/labels'
import { canManageAccommodations } from '@/lib/roles'
import type { Accommodation, Block, RoomBlockType, RoomStatus, RoomType, RoomTypeImage } from '@/types'

const PAGE_SIZE = 20
const TYPE_SEARCH_LIMIT = 20
const ROOM_STATUSES = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_ORDER', 'INACTIVE'] as const
const BLOCK_TYPES = ['MAINTENANCE', 'OWNER_USE', 'OTHER'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function AccommodationsPage() {
  const [tab, setTab] = useState('units')
  const [roomPage, setRoomPage] = useState(1)
  const [typePage, setTypePage] = useState(1)
  const [roomSearch, setRoomSearch] = useState('')
  const [typeSearch, setTypeSearch] = useState('')
  const [roomSearchApplied, setRoomSearchApplied] = useState('')
  const [typeSearchApplied, setTypeSearchApplied] = useState('')

  const roomsQuery = useAdminRooms({
    page: roomPage,
    limit: PAGE_SIZE,
    search: roomSearchApplied || undefined,
  })
  const typesQuery = useAdminRoomTypes({
    page: typePage,
    limit: PAGE_SIZE,
    search: typeSearchApplied || undefined,
  })

  const loading =
    (roomsQuery.isLoading && !roomsQuery.data) || (typesQuery.isLoading && !typesQuery.data)

  if (loading) return <LoadingState />

  if (roomsQuery.isError || typesQuery.isError) {
    return (
      <div className="space-y-3 border-t border-border py-10">
        <p className="text-sm">Не вдалося завантажити розміщення</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void roomsQuery.refetch()
            void typesQuery.refetch()
          }}
        >
          Спробувати ще раз
        </Button>
      </div>
    )
  }

  const today = todayIso()

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="units">Розміщення</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
      </TabsList>
      <TabsContent value="units">
        <UnitSection
          items={roomsQuery.data?.items ?? []}
          today={today}
          page={roomPage}
          pageSize={PAGE_SIZE}
          total={roomsQuery.data?.pagination.total ?? 0}
          search={roomSearch}
          onSearchChange={setRoomSearch}
          onSearchSubmit={() => {
            setRoomSearchApplied(roomSearch.trim())
            setRoomPage(1)
          }}
          onPageChange={setRoomPage}
        />
      </TabsContent>
      <TabsContent value="categories">
        <CategorySection
          page={typesQuery.data}
          currentPage={typePage}
          search={typeSearch}
          onSearchChange={setTypeSearch}
          onSearchSubmit={() => {
            setTypeSearchApplied(typeSearch.trim())
            setTypePage(1)
          }}
          onPageChange={setTypePage}
        />
      </TabsContent>
    </Tabs>
  )
}

function UnitSection({
  items,
  today,
  page,
  pageSize,
  total,
  search,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
}: {
  items: Accommodation[]
  today: string
  page: number
  pageSize: number
  total: number
  search: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onPageChange: (page: number) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const [editing, setEditing] = useState<Accommodation | null | 'new'>(null)
  const [blocking, setBlocking] = useState<Accommodation | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ roomId: string; block: Block } | null>(null)
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
  const typeQueries = useQueries({
    queries: typeIds.map((id) => ({
      queryKey: ['admin-room-type', id],
      queryFn: () => getRoomType(id),
      enabled: Boolean(id),
    })),
  })
  const typeNameById = useMemo(() => {
    const map = new Map<string, string>()
    typeIds.forEach((id, index) => {
      const name = typeQueries[index]?.data?.name
      if (name) map.set(id, name)
    })
    return map
  }, [typeIds, typeQueries])

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
        title="Розміщення"
        action={canWrite ? <Button onClick={openCreate}>Додати розміщення</Button> : undefined}
      />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Єдиний інвентар номерів і будиночків (backend Room). Окремої класифікації cottage/room у API немає —
        категорія задається через тип розміщення.
      </p>
      <form
        className="mb-4 flex max-w-md gap-2"
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
      {items.length === 0 ? (
        <EmptyState>Розміщень за цим запитом немає.</EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Категорія</TableHead>
              <TableHead>Поверх</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const ownBlocks = blocksByRoom.get(item.id) ?? []
              const state = presence(item, ownBlocks, today)
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>{roomDisplayName(item)}</div>
                    <div className="text-xs text-muted-foreground">{item.number}</div>
                  </TableCell>
                  <TableCell>{typeNameById.get(item.roomTypeId) ?? '—'}</TableCell>
                  <TableCell>{item.floor ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {!item.active ? <Badge tone="neutral">Вимкнений</Badge> : null}
                    </div>
                    {ownBlocks.length > 0 ? (
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {ownBlocks.map((block) => (
                          <div key={block.id} className="flex flex-wrap items-center gap-2">
                            <span>
                              {formatDate(block.startDate)} — {formatDate(block.endDate)} ·{' '}
                              {roomBlockTypeLabel[block.type]}
                              {block.reason ? ` · ${block.reason}` : ''}
                              <span className="text-muted-foreground/80"> [початок, кінець)</span>
                            </span>
                            {canWrite ? (
                              <button
                                type="button"
                                className="underline-offset-2 hover:underline"
                                disabled={removeBlock.isPending}
                                onClick={() => setPendingDelete({ roomId: item.id, block })}
                              >
                                Зняти
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
                          Заблокувати
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
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <BlockDialog item={blocking} onOpenChange={(open) => !open && setBlocking(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Зняти блокування?"
        description={
          pendingDelete
            ? `${formatDate(pendingDelete.block.startDate)} — ${formatDate(pendingDelete.block.endDate)}`
            : ''
        }
        confirmLabel="Зняти"
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
            .mutateAsync({ roomId: pendingDelete.roomId, blockId: pendingDelete.block.id })
            .then(() => {
              setPendingDelete(null)
              toast.success('Блокування знято')
            })
            .catch((error) => toast.error(accommodationErrorMessage(error)))
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
  roomTypeId: z.string().min(1, 'Оберіть категорію'),
  floor: z.string(),
  status: z.enum(ROOM_STATUSES),
  active: z.enum(['yes', 'no']),
})

/** Server-side searchable category picker — does not silently cap at a fixed first page. */
function RoomTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [applied, setApplied] = useState('')
  const selected = useAdminRoomType(value || undefined)
  const results = useAdminRoomTypes({
    page: 1,
    limit: TYPE_SEARCH_LIMIT,
    search: applied || undefined,
    active: true,
  })

  const selectedLabel = selected.data
    ? `${selected.data.name} (${selected.data.slug})`
    : value
      ? 'Завантаження…'
      : 'Оберіть категорію'

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal"
        disabled={disabled}
        onClick={() => {
          setDraft(applied)
          setOpen(true)
        }}
      >
        {selectedLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обрати категорію</DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setApplied(draft.trim())
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Пошук за назвою або slug"
              autoFocus
            />
            <Button type="submit" variant="outline">
              Знайти
            </Button>
          </form>
          <div className="max-h-64 space-y-1 overflow-y-auto border-t border-border pt-3">
            {results.isLoading ? <p className="text-sm text-muted-foreground">Завантаження…</p> : null}
            {results.isError ? (
              <div className="space-y-2">
                <p className="text-sm">Не вдалося завантажити категорії</p>
                <Button size="sm" variant="outline" onClick={() => void results.refetch()}>
                  Спробувати ще раз
                </Button>
              </div>
            ) : null}
            {!results.isLoading && !results.isError && (results.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Нічого не знайдено. Змініть пошук.</p>
            ) : null}
            {(results.data?.items ?? []).map((type) => (
              <button
                key={type.id}
                type="button"
                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange(type.id)
                  setOpen(false)
                }}
              >
                <span>{type.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{type.slug}</span>
              </button>
            ))}
            {(results.data?.pagination.total ?? 0) > TYPE_SEARCH_LIMIT ? (
              <p className="px-3 pt-2 text-xs text-muted-foreground">
                Показано {TYPE_SEARCH_LIMIT} з {results.data?.pagination.total}. Уточніть пошук, щоб знайти інші.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Закрити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function UnitDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item?: Accommodation
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const create = useCreateAdminRoom()
  const update = useUpdateAdminRoom()
  const pending = create.isPending || update.isPending
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати розміщення' : 'Нове розміщення'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
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
            try {
              const payload = {
                name: values.name.trim() ? values.name.trim() : null,
                number: values.number,
                roomTypeId: values.roomTypeId,
                floor: floorValue,
                status: values.status,
                active: values.active === 'yes',
              }
              if (item) {
                await update.mutateAsync({ id: item.id, input: payload })
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
          <Field label="Назва">
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <Field label="Номер / код" error={form.formState.errors.number?.message}>
            <Input disabled={!canWrite} {...form.register('number')} />
          </Field>
          <Field label="Категорія" error={form.formState.errors.roomTypeId?.message}>
            <RoomTypePicker
              value={form.watch('roomTypeId')}
              disabled={!canWrite}
              onChange={(value) => form.setValue('roomTypeId', value, { shouldValidate: true })}
            />
          </Field>
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
            <Button type="submit" disabled={!canWrite || pending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const blockSchema = z
  .object({
    startDate: z.string().regex(DATE_RE, 'Формат YYYY-MM-DD'),
    endDate: z.string().regex(DATE_RE, 'Формат YYYY-MM-DD'),
    type: z.enum(BLOCK_TYPES),
    reason: z.string().max(500, 'Причина задовга'),
  })
  .superRefine((value, ctx) => {
    if (value.endDate <= value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Дата завершення має бути пізніше за дату початку',
      })
    }
  })

function BlockDialog({ item, onOpenChange }: { item: Accommodation | null; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const save = useCreateAdminRoomBlock()
  const form = useForm<z.infer<typeof blockSchema>>({
    resolver: zodResolver(blockSchema),
    defaultValues: { startDate: '', endDate: '', type: 'MAINTENANCE', reason: '' },
  })

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) form.reset({ startDate: '', endDate: '', type: 'MAINTENANCE', reason: '' })
        onOpenChange(open)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заблокувати {item ? roomDisplayName(item) : ''}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!item) return
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              await save.mutateAsync({
                roomId: item.id,
                input: {
                  startDate: values.startDate,
                  endDate: values.endDate,
                  type: values.type,
                  reason: values.reason.trim() ? values.reason.trim() : null,
                },
              })
              toast.success('Заблоковано')
              form.reset({ startDate: '', endDate: '', type: 'MAINTENANCE', reason: '' })
              onOpenChange(false)
            } catch (error) {
              toast.error(accommodationErrorMessage(error))
            }
          })}
        >
          <p className="text-sm text-muted-foreground">
            Період напіввідкритий: [початок, кінець). Дата закінчення вільна. Значення передаються як YYYY-MM-DD без
            локального зсуву часового поясу.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Від" error={form.formState.errors.startDate?.message}>
              <Input type="date" disabled={!canWrite} {...form.register('startDate')} />
            </Field>
            <Field label="До (не включно)" error={form.formState.errors.endDate?.message}>
              <Input type="date" disabled={!canWrite} {...form.register('endDate')} />
            </Field>
          </div>
          <Field label="Тип">
            <Select
              value={form.watch('type')}
              onValueChange={(value: RoomBlockType) => form.setValue('type', value)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {roomBlockTypeLabel[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Причина" error={form.formState.errors.reason?.message}>
            <Textarea disabled={!canWrite} {...form.register('reason')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canWrite || save.isPending}>
              Заблокувати
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Назва задовга'),
  slug: z
    .string()
    .trim()
    .min(1, 'Вкажіть slug')
    .max(80, 'Slug задовгий')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Лише малі латинські літери, цифри та дефіси'),
  description: z.string().max(4000, 'Опис задовгий'),
  maxGuests: z.number({ invalid_type_error: 'Вкажіть місткість' }).int().min(1, 'Мінімум 1 гість'),
  active: z.enum(['yes', 'no']),
})

function CategorySection({
  page,
  currentPage,
  search,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
}: {
  page?: { items: RoomType[]; pagination: { page: number; totalPages: number; total: number } }
  currentPage: number
  search: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onPageChange: (page: number) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const [editing, setEditing] = useState<RoomType | 'new' | null>(null)
  const items = page?.items ?? []

  return (
    <div>
      <SectionHeading
        title="Категорії"
        action={canWrite ? <Button onClick={() => setEditing('new')}>Додати категорію</Button> : undefined}
      />
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSearchSubmit()
        }}
      >
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Пошук категорій"
        />
        <Button type="submit" variant="outline">
          Знайти
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState>Категорій поки немає.</EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Місткість</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((type) => (
              <TableRow key={type.id}>
                <TableCell>
                  <div>{type.name}</div>
                  <div className="max-w-md text-xs text-muted-foreground">{type.description ?? '—'}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{type.slug}</TableCell>
                <TableCell>{type.maxGuests}</TableCell>
                <TableCell>
                  <Badge tone={type.active ? 'success' : 'neutral'}>
                    {type.active ? 'Активна' : 'Вимкнена'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(type)}>
                      Редагувати
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Лише перегляд</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={page?.pagination.total ?? 0}
        onPageChange={onPageChange}
      />
      <CategoryDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function CategoryDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item?: RoomType
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const create = useCreateAdminRoomType()
  const update = useUpdateAdminRoomType()
  const pending = create.isPending || update.isPending
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    values: {
      name: item?.name ?? '',
      slug: item?.slug ?? '',
      description: item?.description ?? '',
      maxGuests: item?.maxGuests ?? 2,
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати категорію' : 'Нова категорія'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWrite) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              const input = {
                name: values.name,
                slug: values.slug,
                description: values.description.trim() ? values.description.trim() : null,
                maxGuests: values.maxGuests,
                active: values.active === 'yes',
              }
              if (item) {
                await update.mutateAsync({ id: item.id, input })
              } else {
                await create.mutateAsync(input)
              }
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(accommodationErrorMessage(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <Field label="Slug" error={form.formState.errors.slug?.message} hint="Лише a-z, 0-9 та дефіси">
            <Input disabled={!canWrite} {...form.register('slug')} />
          </Field>
          <Field label="Опис" error={form.formState.errors.description?.message}>
            <Textarea disabled={!canWrite} {...form.register('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Місткість" error={form.formState.errors.maxGuests?.message}>
              <Input
                type="number"
                disabled={!canWrite}
                {...form.register('maxGuests', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Стан">
              <Select
                value={form.watch('active')}
                onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Активна</SelectItem>
                  <SelectItem value="no">Вимкнена</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {item ? <ImageManager roomTypeId={item.id} canWrite={canWrite} /> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canWrite || pending}>
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
        <h3 className="text-sm font-medium">Зображення категорії</h3>
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
    if (error.code === 'ROOM_TYPE_SLUG_EXISTS') return 'Категорія з таким slug уже існує'
    if (error.code === 'ROOM_NUMBER_EXISTS') return 'Такий номер уже існує в цій категорії'
    if (error.code === 'ROOM_BLOCK_OVERLAP') return 'Блокування перетинається з існуючим'
    return error.message
  }
  if (error.details?.length) return error.details.join('. ')
  return error.message || errorMessage(error)
}
