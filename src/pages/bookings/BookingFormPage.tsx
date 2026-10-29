import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { listAllRooms, listAllRoomTypes } from '@/api/accommodations'
import { AdminBookingForm } from '@/components/bookings/AdminBookingForm'
import { Button } from '@/components/ui/button'
import { PageSkeleton, QueryErrorState } from '@/components/ui/page-status'
import { PendingOverlay } from '@/components/ui/pending-overlay'
import {
  useAdminBooking,
  useCreateAdminBooking,
  useUpdateAdminBooking,
} from '@/hooks/useBookings'
import { useAdminRatePlans } from '@/hooks/useHotel'
import { withReferencedRoom } from '@/lib/accommodation-labels'
import { adminBookingRef, formatAdminBookingMoney, parseCalendarPrefill } from '@/lib/admin-booking-view'
import { classifyMutationFailure, type MutationKind, type MutationPhase } from '@/lib/mutation-action'
import { CATALOG_STALE_TIME } from '@/lib/queryClient'
import type { Accommodation, AdminBookingCreateInput, AdminBookingDetail, AdminBookingUpdateInput } from '@/types'

export function BookingFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const bookingQuery = useAdminBooking(id ?? '')
  const roomsQuery = useQuery({
    queryKey: ['admin-rooms-all', { active: true }],
    queryFn: ({ signal }) => listAllRooms({ active: true }, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const typesQuery = useQuery({
    queryKey: ['admin-room-types-all', { active: undefined }],
    queryFn: ({ signal }) => listAllRoomTypes({}, signal),
    staleTime: CATALOG_STALE_TIME,
  })
  const plansQuery = useAdminRatePlans({ page: 1, limit: 100, active: true })
  const createMutation = useCreateAdminBooking()
  const updateMutation = useUpdateAdminBooking(id ?? '')
  const [created, setCreated] = useState<AdminBookingDetail | null>(null)
  const [phase, setPhase] = useState<Extract<MutationPhase, 'idle' | 'submitting' | 'uncertain'>>('idle')
  const [kind, setKind] = useState<MutationKind>(isEdit ? 'update' : 'create')

  const preset = useMemo(() => {
    const parsed = parseCalendarPrefill(params)
    return {
      roomId: parsed.roomId,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
    }
  }, [params])

  const submitting = phase === 'submitting' || createMutation.isPending || updateMutation.isPending
  const blocker = useBlocker(submitting)

  useEffect(() => {
    if (!submitting) return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [submitting])

  useEffect(() => {
    if (!submitting && blocker.state === 'blocked') blocker.proceed()
  }, [blocker, submitting])

  if (created) {
    return (
      <div className="mx-auto max-w-xl space-y-4 border-t border-border py-8">
        <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Створено</p>
        <h2 className="font-serif text-4xl font-medium">Бронювання {adminBookingRef(created.id)}</h2>
        <p className="text-sm text-muted-foreground">
          {created.guest.lastName} {created.guest.firstName} · {created.checkIn} — {created.checkOut}
        </p>
        <p className="font-serif text-3xl">{formatAdminBookingMoney(created.price.totalAmount, created.price.currency)}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to={`/admin/bookings/${created.id}`}>Відкрити бронювання</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => setCreated(null)}>
            Нове бронювання
          </Button>
        </div>
      </div>
    )
  }

  if (isEdit && bookingQuery.isLoading && !bookingQuery.data) return <PageSkeleton label="Завантажуємо бронювання…" />
  if (!roomsQuery.data && roomsQuery.isLoading) return <PageSkeleton label="Завантажуємо номери та тарифи…" />
  if (!typesQuery.data && typesQuery.isLoading) return <PageSkeleton label="Завантажуємо номери та тарифи…" />
  if (!plansQuery.data && plansQuery.isLoading) return <PageSkeleton label="Завантажуємо номери та тарифи…" />

  if (isEdit && bookingQuery.isError) {
    return (
      <QueryErrorState
        title="Не вдалося завантажити бронювання."
        error={bookingQuery.error}
        onRetry={() => void bookingQuery.refetch()}
      />
    )
  }

  if (roomsQuery.isError || typesQuery.isError || plansQuery.isError) {
    return (
      <QueryErrorState
        title="Не вдалося завантажити номери або тарифи."
        error={roomsQuery.error ?? typesQuery.error ?? plansQuery.error}
        onRetry={() => {
          void roomsQuery.refetch()
          void typesQuery.refetch()
          void plansQuery.refetch()
        }}
      />
    )
  }

  if (isEdit && !bookingQuery.data) {
    return <p className="text-sm text-destructive">Бронювання не знайдено.</p>
  }

  const currentRoom = bookingQuery.data?.rooms[0]
  const referencedRoom: Accommodation | null = currentRoom
    ? {
        id: currentRoom.roomId,
        roomTypeId: currentRoom.roomTypeId,
        number: currentRoom.number,
        name: null,
        floor: null,
        status: 'INACTIVE',
        active: false,
        createdAt: '',
        updatedAt: '',
      }
    : null
  const rooms = withReferencedRoom(roomsQuery.data ?? [], referencedRoom)
  const roomTypes = typesQuery.data ?? []
  const ratePlans = plansQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      {phase === 'submitting' || phase === 'uncertain' ? (
        <PendingOverlay
          kind={kind}
          phase={phase}
          onStopWaiting={phase === 'uncertain' && kind !== 'create' ? () => setPhase('idle') : undefined}
          onCheckList={phase === 'uncertain' ? () => navigate('/admin/bookings') : undefined}
        />
      ) : null}
      {blocker.state === 'blocked' ? (
        <p className="text-sm text-muted-foreground">Дочекайтеся відповіді сервера, перш ніж залишати сторінку.</p>
      ) : null}
      <div>
        <h2 className="font-serif text-3xl font-medium">{isEdit ? 'Редагування бронювання' : 'Нове бронювання'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ціна розраховується на сервері. Джерело: ADMIN. Статус при створенні: CONFIRMED.
        </p>
      </div>
      <AdminBookingForm
        booking={bookingQuery.data}
        rooms={rooms}
        roomTypes={roomTypes}
        ratePlans={ratePlans}
        preset={isEdit ? undefined : preset}
        submitting={submitting || phase === 'uncertain'}
        onCreateActivity={(active) => {
          if (isEdit) return
          if (active) {
            setKind('create')
            setPhase('submitting')
            return
          }
          setPhase('idle')
        }}
        onSubmit={async (input) => {
          const nextKind: MutationKind = isEdit ? 'update' : 'create'
          setKind(nextKind)
          setPhase('submitting')
          try {
            if (isEdit) {
              const saved = await updateMutation.mutateAsync(input as AdminBookingUpdateInput)
              setPhase('idle')
              toast.success('Бронювання оновлено')
              navigate(`/admin/bookings/${saved.id}`)
              return
            }
            const saved = await createMutation.mutateAsync(input as AdminBookingCreateInput)
            setPhase('idle')
            toast.success('Бронювання створено')
            setCreated(saved)
          } catch (error) {
            if (classifyMutationFailure(nextKind, error) === 'uncertain') {
              setPhase('uncertain')
              return
            }
            setPhase('idle')
            throw error
          }
        }}
      />
    </div>
  )
}
