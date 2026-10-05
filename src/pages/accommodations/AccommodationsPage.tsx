import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useBookings } from '@/hooks/useBookings'
import {
  useAccommodations,
  useBlocks,
  useCreateBlock,
  useDeleteBlock,
  useDeleteRoomType,
  useRoomTypes,
  useSaveAccommodation,
  useSaveRoomType,
} from '@/hooks/useHotel'
import { todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney } from '@/lib/format'
import { HOLDING_STATUSES } from '@/lib/labels'
import type { Accommodation, AccommodationKind, RoomType } from '@/types'

export function AccommodationsPage() {
  const accommodations = useAccommodations()
  const roomTypes = useRoomTypes()
  const blocks = useBlocks()
  const bookings = useBookings({})
  const [tab, setTab] = useState('rooms')

  if (!accommodations.data || !roomTypes.data || !blocks.data || !bookings.data) return <LoadingState />

  const today = todayIso()
  const rooms = accommodations.data.filter((item) => item.kind === 'room')
  const houses = accommodations.data.filter((item) => item.kind === 'house')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="rooms">Номери</TabsTrigger>
        <TabsTrigger value="houses">Будиночки</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
      </TabsList>
      <TabsContent value="rooms">
        <UnitSection
          kind="room"
          title="Номери"
          items={rooms}
          roomTypes={roomTypes.data}
          blocks={blocks.data}
          bookings={bookings.data}
          today={today}
        />
      </TabsContent>
      <TabsContent value="houses">
        <UnitSection
          kind="house"
          title="Будиночки"
          items={houses}
          roomTypes={roomTypes.data}
          blocks={blocks.data}
          bookings={bookings.data}
          today={today}
        />
      </TabsContent>
      <TabsContent value="categories">
        <CategorySection roomTypes={roomTypes.data} />
      </TabsContent>
    </Tabs>
  )
}

function presence(
  item: Accommodation,
  bookings: { accommodationId: string; status: string; checkIn: string; checkOut: string }[],
  blocks: { accommodationId: string; from: string; to: string; reason: string; id: string }[],
  today: string,
) {
  const inHouse = bookings.find(
    (entry) =>
      entry.accommodationId === item.id &&
      entry.status === 'CHECKED_IN' &&
      entry.checkIn <= today &&
      entry.checkOut >= today,
  )
  if (inHouse) {
    return {
      label: inHouse.checkOut === today ? 'Виїзд сьогодні' : 'Зайнято',
      tone: 'checkedIn' as const,
      detail: '',
    }
  }
  const block = blocks.find((entry) => entry.accommodationId === item.id && today >= entry.from && today <= entry.to)
  if (block) return { label: 'Заблоковано', tone: 'cancelled' as const, detail: block.reason }
  const stay = bookings.find(
    (entry) =>
      entry.accommodationId === item.id &&
      HOLDING_STATUSES.includes(entry.status as 'PENDING') &&
      entry.checkIn <= today &&
      entry.checkOut > today,
  )
  if (stay) return { label: 'Зайнято', tone: 'checkedIn' as const, detail: '' }
  return { label: 'Вільно', tone: 'neutral' as const, detail: '' }
}

function UnitSection({
  kind,
  title,
  items,
  roomTypes,
  blocks,
  bookings,
  today,
}: {
  kind: AccommodationKind
  title: string
  items: Accommodation[]
  roomTypes: RoomType[]
  blocks: { id: string; accommodationId: string; from: string; to: string; reason: string }[]
  bookings: { accommodationId: string; status: string; checkIn: string; checkOut: string }[]
  today: string
}) {
  const [editing, setEditing] = useState<Accommodation | null | 'new'>(null)
  const [blocking, setBlocking] = useState<Accommodation | null>(null)
  const removeBlock = useDeleteBlock()

  return (
    <div>
      <SectionHeading
        title={title}
        action={<Button onClick={() => setEditing('new')}>{kind === 'room' ? 'Додати номер' : 'Додати будиночок'}</Button>}
      />
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
            const state = presence(item, bookings, blocks, today)
            const type = roomTypes.find((entry) => entry.id === item.roomTypeId)
            const ownBlocks = blocks.filter((entry) => entry.accommodationId === item.id)
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.code}</div>
                </TableCell>
                <TableCell>{type?.name ?? '—'}</TableCell>
                <TableCell>{item.floor ?? '—'}</TableCell>
                <TableCell>
                  <Badge tone={state.tone}>{state.label}</Badge>
                  {ownBlocks.length > 0 ? (
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {ownBlocks.map((block) => (
                        <div key={block.id} className="flex items-center gap-2">
                          <span>
                            {formatDate(block.from)} — {formatDate(block.to)} · {block.reason}
                          </span>
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={async () => {
                              try {
                                await removeBlock.mutateAsync(block.id)
                                toast.success('Блокування знято')
                              } catch (error) {
                                toast.error(errorMessage(error))
                              }
                            }}
                          >
                            Зняти
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                      Редагувати
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setBlocking(item)}>
                      Заблокувати
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <UnitDialog
        open={editing !== null}
        kind={kind}
        roomTypes={roomTypes.filter((item) => item.kind === kind)}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <BlockDialog item={blocking} onOpenChange={(open) => !open && setBlocking(null)} />
    </div>
  )
}

const unitSchema = z.object({
  name: z.string().min(1, 'Вкажіть назву'),
  code: z.string().min(1, 'Вкажіть код'),
  roomTypeId: z.string().min(1, 'Оберіть категорію'),
  floor: z.string(),
})

function UnitDialog({
  open,
  kind,
  roomTypes,
  item,
  onOpenChange,
}: {
  open: boolean
  kind: AccommodationKind
  roomTypes: RoomType[]
  item?: Accommodation
  onOpenChange: (open: boolean) => void
}) {
  const save = useSaveAccommodation()
  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    values: {
      name: item?.name ?? '',
      code: item?.code ?? '',
      roomTypeId: item?.roomTypeId ?? roomTypes[0]?.id ?? '',
      floor: item?.floor ? String(item.floor) : '',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати' : kind === 'room' ? 'Новий номер' : 'Новий будиночок'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                name: values.name,
                code: values.code,
                roomTypeId: values.roomTypeId,
                kind,
                floor: values.floor ? Number(values.floor) : null,
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Код" error={form.formState.errors.code?.message}>
            <Input {...form.register('code')} />
          </Field>
          <Field label="Категорія" error={form.formState.errors.roomTypeId?.message}>
            <Select value={form.watch('roomTypeId')} onValueChange={(value) => form.setValue('roomTypeId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {kind === 'room' ? (
            <Field label="Поверх">
              <Input type="number" {...form.register('floor')} />
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const blockSchema = z.object({
  from: z.string().min(1, 'Вкажіть дату'),
  to: z.string().min(1, 'Вкажіть дату'),
  reason: z.string().min(1, 'Вкажіть причину'),
})

function BlockDialog({ item, onOpenChange }: { item: Accommodation | null; onOpenChange: (open: boolean) => void }) {
  const save = useCreateBlock()
  const form = useForm<z.infer<typeof blockSchema>>({
    resolver: zodResolver(blockSchema),
    defaultValues: { from: '', to: '', reason: '' },
  })

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) form.reset()
        onOpenChange(open)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заблокувати {item?.name}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!item) return
            try {
              await save.mutateAsync({ accommodationId: item.id, ...values })
              toast.success('Заблоковано')
              form.reset()
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Від" error={form.formState.errors.from?.message}>
              <Input type="date" {...form.register('from')} />
            </Field>
            <Field label="До" error={form.formState.errors.to?.message}>
              <Input type="date" {...form.register('to')} />
            </Field>
          </div>
          <Field label="Причина" error={form.formState.errors.reason?.message}>
            <Textarea {...form.register('reason')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Заблокувати
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const categorySchema = z.object({
  name: z.string().min(1, 'Вкажіть назву'),
  kind: z.enum(['room', 'house']),
  description: z.string(),
  capacity: z.number({ invalid_type_error: 'Вкажіть місткість' }).int().min(1),
  sizeM2: z.number({ invalid_type_error: 'Вкажіть площу' }).min(1),
  basePrice: z.number({ invalid_type_error: 'Вкажіть ціну' }).min(0),
  amenities: z.string(),
})

function CategorySection({ roomTypes }: { roomTypes: RoomType[] }) {
  const [editing, setEditing] = useState<RoomType | 'new' | null>(null)
  const remove = useDeleteRoomType()

  return (
    <div>
      <SectionHeading title="Категорії" action={<Button onClick={() => setEditing('new')}>Додати категорію</Button>} />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Назва</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Місткість</TableHead>
            <TableHead>Базова ціна</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roomTypes.map((type) => (
            <TableRow key={type.id}>
              <TableCell>
                <div>{type.name}</div>
                <div className="max-w-md text-xs text-muted-foreground">{type.description}</div>
              </TableCell>
              <TableCell>{type.kind === 'room' ? 'Номер' : 'Будиночок'}</TableCell>
              <TableCell>{type.capacity}</TableCell>
              <TableCell>{formatMoney(type.basePrice)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(type)}>
                    Редагувати
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await remove.mutateAsync(type.id)
                        toast.success('Категорію видалено')
                      } catch (error) {
                        toast.error(errorMessage(error))
                      }
                    }}
                  >
                    Видалити
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  const save = useSaveRoomType()
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    values: {
      name: item?.name ?? '',
      kind: item?.kind ?? 'room',
      description: item?.description ?? '',
      capacity: item?.capacity ?? 2,
      sizeM2: item?.sizeM2 ?? 20,
      basePrice: item?.basePrice ?? 0,
      amenities: item?.amenities.join(', ') ?? '',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати категорію' : 'Нова категорія'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                name: values.name,
                kind: values.kind,
                description: values.description,
                capacity: values.capacity,
                sizeM2: values.sizeM2,
                basePrice: values.basePrice,
                amenities: values.amenities
                  .split(',')
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          })}
        >
          <Field label="Назва" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Тип">
            <Select value={form.watch('kind')} onValueChange={(value: 'room' | 'house') => form.setValue('kind', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="room">Номер</SelectItem>
                <SelectItem value="house">Будиночок</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Опис">
            <Textarea {...form.register('description')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Місткість" error={form.formState.errors.capacity?.message}>
              <Input type="number" {...form.register('capacity', { valueAsNumber: true })} />
            </Field>
            <Field label="Площа, м²" error={form.formState.errors.sizeM2?.message}>
              <Input type="number" {...form.register('sizeM2', { valueAsNumber: true })} />
            </Field>
            <Field label="Базова ціна" error={form.formState.errors.basePrice?.message}>
              <Input type="number" {...form.register('basePrice', { valueAsNumber: true })} />
            </Field>
          </div>
          <Field label="Зручності" hint="Через кому">
            <Input {...form.register('amenities')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
