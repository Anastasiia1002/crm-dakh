import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminBookingForm } from '@/components/bookings/AdminBookingForm'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/states'
import {
  useAdminBooking,
  useCreateAdminBooking,
  useUpdateAdminBooking,
} from '@/hooks/useBookings'
import { useAdminRatePlans, useAdminRooms } from '@/hooks/useHotel'
import { addCalendarDays } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { parseCalendarPrefill } from '@/lib/admin-booking-view'
import type { AdminBookingCreateInput, AdminBookingUpdateInput } from '@/types'

export function BookingFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const bookingQuery = useAdminBooking(id ?? '')
  const roomsQuery = useAdminRooms({ page: 1, limit: 100, active: true })
  const plansQuery = useAdminRatePlans({ page: 1, limit: 100, active: true })
  const createMutation = useCreateAdminBooking()
  const updateMutation = useUpdateAdminBooking(id ?? '')

  const preset = useMemo(() => {
    const parsed = parseCalendarPrefill(params)
    return {
      roomId: parsed.roomId,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut ?? (parsed.checkIn ? addCalendarDays(parsed.checkIn, 1) : undefined),
    }
  }, [params])

  if (isEdit && bookingQuery.isLoading) return <LoadingState />
  if (roomsQuery.isLoading || plansQuery.isLoading) return <LoadingState />

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

  if (roomsQuery.isError || plansQuery.isError) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm">Не вдалося завантажити номери або тарифи.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void roomsQuery.refetch()
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
          navigate(`/admin/bookings/${saved.id}`)
        }}
      />
    </div>
  )
}
