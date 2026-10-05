import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookingForm } from '@/components/bookings/BookingForm'
import { LoadingState } from '@/components/ui/states'
import { useBooking, useCreateBooking, useGuests, useUpdateBooking } from '@/hooks/useBookings'
import {
  useAccommodations,
  usePricePeriods,
  usePromoCodes,
  useRatePlans,
  useRoomTypes,
  useServices,
  useSettings,
} from '@/hooks/useHotel'
import { addDaysIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'

export function BookingFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const booking = useBooking(id ?? '')
  const guests = useGuests()
  const accommodations = useAccommodations()
  const roomTypes = useRoomTypes()
  const ratePlans = useRatePlans()
  const periods = usePricePeriods()
  const services = useServices()
  const promos = usePromoCodes()
  const settings = useSettings()
  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking(id ?? '')

  if (id && booking.isError) return <p className="text-sm text-destructive">Бронювання не знайдено.</p>

  if (
    !guests.data ||
    !accommodations.data ||
    !roomTypes.data ||
    !ratePlans.data ||
    !periods.data ||
    !services.data ||
    !promos.data ||
    !settings.data ||
    (id && !booking.data)
  ) {
    return <LoadingState />
  }

  const checkIn = params.get('checkIn') ?? undefined
  const preset = {
    accommodationId: params.get('accommodationId') ?? undefined,
    checkIn,
    checkOut: params.get('checkOut') ?? (checkIn ? addDaysIso(checkIn, 1) : undefined),
  }

  return (
    <BookingForm
      booking={booking.data}
      guests={guests.data}
      accommodations={accommodations.data}
      roomTypes={roomTypes.data}
      ratePlans={ratePlans.data}
      periods={periods.data}
      services={services.data}
      promos={promos.data}
      defaultCheckInTime={settings.data.checkInTime}
      preset={id ? undefined : preset}
      submitting={createBooking.isPending || updateBooking.isPending}
      onSubmit={async (input) => {
        try {
          const saved = id ? await updateBooking.mutateAsync(input) : await createBooking.mutateAsync(input)
          toast.success(id ? 'Бронювання оновлено' : 'Бронювання створено')
          navigate(`/admin/bookings/${saved.id}`)
        } catch (error) {
          toast.error(errorMessage(error))
        }
      }}
    />
  )
}
