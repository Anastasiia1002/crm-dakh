import { BookingMeta } from '@/components/bookings/BookingWorkspaceSection'

export function BookingStaySummary({
  checkIn,
  checkOut,
  nights,
  guests,
  accommodation,
  source,
}: {
  checkIn: string
  checkOut: string
  nights: string
  guests: string
  accommodation: string
  source: string
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md bg-surface px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
      <BookingMeta label="Заїзд" value={checkIn} />
      <BookingMeta label="Виїзд" value={checkOut} />
      <BookingMeta label="Ночі" value={nights} />
      <BookingMeta label="Гості" value={guests} />
      <BookingMeta label="Розміщення" value={accommodation} />
      <BookingMeta label="Джерело" value={source} />
    </div>
  )
}
