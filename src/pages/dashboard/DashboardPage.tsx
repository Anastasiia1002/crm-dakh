import { BookingTable } from '@/components/bookings/BookingTable'
import { LoadingState, SectionHeading } from '@/components/ui/states'
import { useAccommodations } from '@/hooks/useHotel'
import { useDashboard, useGuests } from '@/hooks/useBookings'

const stats = [
  { key: 'arrivalsToday', label: 'Заїзди сьогодні' },
  { key: 'departuresToday', label: 'Виїзди сьогодні' },
  { key: 'guestsInHouse', label: 'Гості в готелі' },
  { key: 'availableRooms', label: 'Доступні номери' },
  { key: 'occupancyPercent', label: 'Завантаженість' },
] as const

export function DashboardPage() {
  const dashboard = useDashboard()
  const guests = useGuests()
  const accommodations = useAccommodations()

  if (dashboard.isLoading || guests.isLoading || accommodations.isLoading || !dashboard.data || !guests.data || !accommodations.data) {
    return <LoadingState />
  }

  const data = dashboard.data

  return (
    <div className="space-y-12">
      <section className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-6 md:grid-cols-5">
        {stats.map((stat) => {
          const value = data[stat.key]
          return (
            <div key={stat.key} className="min-w-0">
              <p className="font-serif text-4xl leading-none tracking-tight md:text-5xl">
                {stat.key === 'occupancyPercent' ? `${value}%` : String(value).padStart(2, '0')}
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground">{stat.label}</p>
            </div>
          )
        })}
      </section>

      <section>
        <SectionHeading title="Сьогодні" />
        <div className="grid gap-10 xl:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm tracking-wide text-muted-foreground">Заїзди сьогодні</h3>
            <BookingTable
              variant="arrivals"
              bookings={data.arrivals}
              guests={guests.data}
              accommodations={accommodations.data}
              empty="Сьогодні заїздів немає."
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm tracking-wide text-muted-foreground">Виїзди сьогодні</h3>
            <BookingTable
              variant="departures"
              bookings={data.departures}
              guests={guests.data}
              accommodations={accommodations.data}
              empty="Сьогодні виїздів немає."
            />
          </div>
        </div>
      </section>

      <section>
        <SectionHeading title="Найближчі бронювання" />
        <BookingTable
          variant="upcoming"
          bookings={data.upcoming}
          guests={guests.data}
          accommodations={accommodations.data}
          empty="Найближчих бронювань немає."
        />
      </section>
    </div>
  )
}
