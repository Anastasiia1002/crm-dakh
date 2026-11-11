import { BookingWorkspaceSection } from '@/components/bookings/BookingWorkspaceSection'
import { formatAdminBookingMoney } from '@/lib/admin-booking-view'
import type { AdminBookingPrice } from '@/types'

export function BookingFinancePanel({ price }: { price: AdminBookingPrice }) {
  return (
    <BookingWorkspaceSection title="Сума">
      <p className="text-xl font-medium tabular-nums">
        {formatAdminBookingMoney(price.totalAmount, price.currency)}
      </p>
      <dl className="space-y-1.5 text-sm">
        <Row label="Проживання" value={formatAdminBookingMoney(price.roomSubtotal, price.currency)} />
        <Row label="Послуги" value={formatAdminBookingMoney(price.servicesTotal, price.currency)} />
        <Row label="Знижка" value={formatAdminBookingMoney(price.discountAmount, price.currency)} />
        <Row label="Податок" value={formatAdminBookingMoney(price.taxAmount, price.currency)} />
      </dl>
    </BookingWorkspaceSection>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
