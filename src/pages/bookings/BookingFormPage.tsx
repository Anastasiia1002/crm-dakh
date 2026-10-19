import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminBookingForm } from '@/components/bookings/AdminBookingForm'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/states'
import {
  useAdminBooking,
  useCreateAdminBooking,
  useUpdateAdminBooking,
} from '@/hooks/useBookings'
import { useAdminRatePlans, useAdminRoomTypes, useAdminRooms } from '@/hooks/useHotel'
import { adminBookingRef, formatAdminBookingMoney, parseCalendarPrefill } from '@/lib/admin-booking-view'
import { errorMessage } from '@/lib/errors'
import type { AdminBookingCreateInput, AdminBookingDetail, AdminBookingUpdateInput } from '@/types'

export function BookingFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const bookingQuery = useAdminBooking(id ?? '')
  const roomsQuery = useAdminRooms({ page: 1, limit: 100, active: true })
  const typesQuery = useAdminRoomTypes({ page: 1, limit: 100, active: true })
  const plansQuery = useAdminRatePlans({ page: 1, limit: 100, active: true })
  const createMutation = useCreateAdminBooking()
  const updateMutation = useUpdateAdminBooking(id ?? '')
  const [created, setCreated] = useState<AdminBookingDetail | null>(null)

  const preset = useMemo(() => {
    const parsed = parseCalendarPrefill(params)
    return {
      roomId: parsed.roomId,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
    }
  }, [params])

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

  if (isEdit && bookingQuery.isLoading) return <LoadingState />
  if (roomsQuery.isLoading || typesQuery.isLoading || plansQuery.isLoading) return <LoadingState />

  if (isEdit && bookingQuery.isError) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm">Не вдалося завантажити бронювання.</p>
        <p className="text-sm text-muted-foreground">{errorMessage(bookingQuery.error)}</p>
        <Button size="sm" variant="outline" onClick={() => void bookingQuery.refetch()}>
          Спробувати ще раз
        </Button>
      </div>
    )
  }

  if (roomsQuery.isError || typesQuery.isError || plansQuery.isError) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm">Не вдалося завантажити номери або тарифи.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void roomsQuery.refetch()
            void typesQuery.refetch()
            void plansQuery.refetch()
          }}
        >
          Спробувати ще раз
        </Button>
      </div>
    )
  }

  if (isEdit && !bookingQuery.data) {
    return <p className="text-sm text-destructive">Бронювання не знайдено.</p>
  }

  const rooms = roomsQuery.data?.items ?? []
  const roomTypes = typesQuery.data?.items ?? []
  const ratePlans = plansQuery.data?.items ?? []
  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
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
        submitting={submitting}
        onSubmit={async (input) => {
          if (isEdit) {
            const saved = await updateMutation.mutateAsync(input as AdminBookingUpdateInput)
            toast.success('Бронювання оновлено')
            navigate(`/admin/bookings/${saved.id}`)
            return
          }
          const saved = await createMutation.mutateAsync(input as AdminBookingCreateInput)
          toast.success('Бронювання створено')
          setCreated(saved)
        }}
      />
    </div>
  )
}
