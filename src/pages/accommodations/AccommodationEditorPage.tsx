import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AccommodationPhotoGallery } from '@/components/accommodations/AccommodationPhotoGallery'
import { RoomTypePicker } from '@/components/accommodations/RoomTypePicker'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/states'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminRoom,
  useAdminRooms,
  useAdminRoomType,
  useCreateAdminRoom,
  useUpdateAdminRoom,
  useUpdateAdminRoomType,
} from '@/hooks/useHotel'
import { accommodationErrorMessage } from '@/lib/accommodation-editor'
import { sharedRoomTypeNotice } from '@/lib/accommodation-labels'
import { roomStatusLabel, roomTypeKindLabel } from '@/lib/labels'
import { canManageAccommodations } from '@/lib/roles'
import type { RoomStatus, RoomTypeKind } from '@/types'

const ROOM_STATUSES = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_ORDER', 'INACTIVE'] as const

const unitSchema = z.object({
  name: z.string().max(200, 'Назва задовга'),
  number: z.string().trim().min(1, 'Вкажіть номер').max(50, 'Номер задовгий'),
  roomTypeId: z.string().min(1, 'Оберіть тип розміщення'),
  floor: z.string(),
  status: z.enum(ROOM_STATUSES),
  active: z.enum(['yes', 'no']),
})

const emptyUnit: z.infer<typeof unitSchema> = {
  name: '',
  number: '',
  roomTypeId: '',
  floor: '',
  status: 'AVAILABLE',
  active: 'yes',
}

function listPath(kind: RoomTypeKind | null) {
  return kind === 'COTTAGE' ? '/admin/accommodations?tab=cottages' : '/admin/accommodations'
}

function parseKind(value: string | null): RoomTypeKind | null {
  if (value === 'ROOM' || value === 'COTTAGE') return value
  return null
}

export function AccommodationEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id
  const requestedKind = parseKind(params.get('kind'))
  const room = useAdminRoom(id)
  const { user } = useAuth()
  const canWrite = canManageAccommodations(user?.role)
  const create = useCreateAdminRoom()
  const update = useUpdateAdminRoom()
  const updateType = useUpdateAdminRoomType()
  const pending = create.isPending || update.isPending || updateType.isPending
  const [guestName, setGuestName] = useState('')
  const [description, setDescription] = useState('')
  const [maxGuests, setMaxGuests] = useState('2')
  const [typeBaseline, setTypeBaseline] = useState<{ name: string; description: string; maxGuests: string } | null>(null)
  const [typeError, setTypeError] = useState<string | null>(null)
  const leaveReadyRef = useRef(false)
  const form = useForm<z.infer<typeof unitSchema>>({
    resolver: zodResolver(unitSchema),
    defaultValues: emptyUnit,
  })

  const item = room.data
  const assignedType = useAdminRoomType(item?.roomTypeId)
  const selectedTypeId = form.watch('roomTypeId')
  const selectedType = useAdminRoomType(!item ? selectedTypeId || undefined : undefined)
  const sharedUnits = useAdminRooms(
    { page: 1, limit: 1, roomTypeId: item?.roomTypeId },
    { enabled: Boolean(item?.roomTypeId) },
  )
  const sharedUnitCount = sharedUnits.isSuccess ? sharedUnits.data.pagination.total : null
  const kind = item ? (assignedType.data?.kind ?? requestedKind) : requestedKind
  const categoryPending = isNew && Boolean(selectedTypeId) && (selectedType.isLoading || selectedType.isFetching)
  const kindMismatch = Boolean(isNew && selectedType.data && kind && selectedType.data.kind !== kind)
  const categoryMissing = Boolean(isNew && selectedTypeId && !categoryPending && !selectedType.data)
  const createTypeReady = Boolean(selectedTypeId) && !categoryPending && !kindMismatch && !categoryMissing
  const typeDirty = Boolean(
    typeBaseline &&
      (guestName !== typeBaseline.name ||
        description !== typeBaseline.description ||
        maxGuests !== typeBaseline.maxGuests),
  )
  const dirty = form.formState.isDirty || typeDirty
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const blocker = useBlocker(() => !leaveReadyRef.current && dirtyRef.current)

  const roomId = item?.id
  useEffect(() => {
    if (!item || item.id !== roomId) return
    form.reset({
      name: item.name ?? '',
      number: item.number,
      roomTypeId: item.roomTypeId,
      floor: item.floor != null ? String(item.floor) : '',
      status: item.status,
      active: item.active ? 'yes' : 'no',
    })
    // Reload the saved unit once. A later refetch must not wipe text the administrator is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  const loadedTypeId = assignedType.data?.id
  useEffect(() => {
    if (!item || !assignedType.data || assignedType.data.id !== item.roomTypeId) return
    const next = {
      name: assignedType.data.name,
      description: assignedType.data.description ?? '',
      maxGuests: String(assignedType.data.maxGuests),
    }
    setGuestName(next.name)
    setDescription(next.description)
    setMaxGuests(next.maxGuests)
    setTypeBaseline(next)
    setTypeError(null)
  }, [assignedType.data, item, loadedTypeId])

  useEffect(() => {
    if (!dirty) return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  if (!isNew && room.isLoading) return <LoadingState />
  if (!isNew && (room.isError || !item)) {
    return (
      <div className="space-y-4">
        <Link to="/admin/accommodations" className="text-sm text-muted-foreground hover:text-foreground">
          ← Номери та будиночки
        </Link>
        <p className="text-sm">Не вдалося відкрити розміщення</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void room.refetch()}>
          Спробувати ще раз
        </Button>
      </div>
    )
  }
  if (isNew && !requestedKind) {
    return (
      <div className="space-y-4">
        <Link to="/admin/accommodations" className="text-sm text-muted-foreground hover:text-foreground">
          ← Номери та будиночки
        </Link>
        <h1 className="font-serif text-3xl font-medium">Нове розміщення</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/admin/accommodations/new?kind=ROOM">Додати номер</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/accommodations/new?kind=COTTAGE">Додати будиночок</Link>
          </Button>
        </div>
      </div>
    )
  }

  const title = item
    ? kind === 'COTTAGE'
      ? 'Редагувати будиночок'
      : 'Редагувати номер'
    : kind === 'COTTAGE'
      ? 'Новий будиночок'
      : 'Новий номер'

  return (
    <div className="mx-auto w-full max-w-3xl pb-8" data-accommodation-editor>
      <Link to={listPath(kind)} className="text-sm text-muted-foreground hover:text-foreground">
        ← Номери та будиночки
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">{title}</h1>
      <form
        className="mt-8 space-y-10"
        onSubmit={form.handleSubmit(async (values) => {
          if (!canWrite) {
            toast.error('Недостатньо прав для цієї дії')
            return
          }
          if (isNew && !createTypeReady) {
            form.setError('roomTypeId', {
              message: kind ? `Оберіть тип «${roomTypeKindLabel[kind]}»` : 'Оберіть тип розміщення',
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
              toast.success('Збережено')
              leaveReadyRef.current = true
              navigate(listPath(kind))
            } else {
              const created = await create.mutateAsync(payload)
              toast.success('Збережено')
              leaveReadyRef.current = true
              navigate(`/admin/accommodations/${created.id}/edit`)
            }
          } catch (error) {
            toast.error(accommodationErrorMessage(error))
          }
        })}
      >
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-medium">Основна інформація</h2>
          <Field label="Назва" hint="Як одиницю видно в CRM">
            <Input disabled={!canWrite} {...form.register('name')} />
          </Field>
          <Field label="Номер / код" error={form.formState.errors.number?.message}>
            <Input disabled={!canWrite} {...form.register('number')} />
          </Field>
          {item ? (
            <>
              <p className="text-sm text-muted-foreground">{sharedRoomTypeNotice(sharedUnitCount)}</p>
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
            </>
          ) : (
            <Field label="Тип розміщення" error={form.formState.errors.roomTypeId?.message}>
              <RoomTypePicker
                value={form.watch('roomTypeId')}
                kind={kind ?? 'ROOM'}
                activeOnly
                disabled={!canWrite}
                onChange={(value) => form.setValue('roomTypeId', value, { shouldValidate: true, shouldDirty: true })}
              />
            </Field>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-medium">Місткість і стан</h2>
          {item ? (
            <Field label="Місткість" hint="Спільний максимум гостей для всіх розміщень цього типу">
              <Input
                type="number"
                min={1}
                disabled={!canWrite || !assignedType.data}
                value={maxGuests}
                onChange={(event) => setMaxGuests(event.target.value)}
              />
            </Field>
          ) : null}
          {typeError ? <p className="text-sm text-destructive">{typeError}</p> : null}
          {item && assignedType.isError ? (
            <p className="text-sm text-muted-foreground">
              Не вдалося завантажити опис і місткість. Назву, номер і стан усе одно можна зберегти.
            </p>
          ) : null}
          <Field label="Поверх" error={form.formState.errors.floor?.message} hint="Необовʼязково">
            <Input type="number" disabled={!canWrite} {...form.register('floor')} />
          </Field>
          <Field label="Статус">
            <Select
              value={form.watch('status')}
              onValueChange={(value: RoomStatus) => form.setValue('status', value, { shouldDirty: true })}
              disabled={!canWrite}
            >
              <SelectTrigger className="min-h-11 w-full">
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
              onValueChange={(value: 'yes' | 'no') => form.setValue('active', value, { shouldDirty: true })}
              disabled={!canWrite}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активний</SelectItem>
                <SelectItem value="no">Вимкнений</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="pb-24">
          {item && assignedType.data ? (
            <AccommodationPhotoGallery roomTypeId={assignedType.data.id} canWrite={canWrite} />
          ) : (
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-medium">Фото</h2>
              <p className="text-sm text-muted-foreground">Фото можна додати після збереження розміщення.</p>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-border bg-background py-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(listPath(kind))}>
            Скасувати
          </Button>
          <Button
            type="submit"
            className="min-h-11"
            disabled={!canWrite || pending || (isNew && !createTypeReady) || Boolean(item && assignedType.isLoading)}
            loading={pending}
          >
            Зберегти
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Є незбережені зміни"
        description="Якщо вийти зараз, зміни форми не збережуться."
        confirmLabel="Вийти без збереження"
        destructive
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset()
        }}
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </div>
  )
}
