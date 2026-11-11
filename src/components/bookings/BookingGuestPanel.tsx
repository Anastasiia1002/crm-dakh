import { Link } from 'react-router-dom'
import { Mail, Phone, UserRound } from 'lucide-react'
import { BookingWorkspaceSection } from '@/components/bookings/BookingWorkspaceSection'
import { bookingEmailHref, bookingGuestProfilePath, bookingPhoneHref } from '@/lib/booking-detail-workspace'
import { adminGuestName } from '@/lib/admin-booking-view'
import type { AdminBookingGuest } from '@/types'

export function BookingGuestPanel({ guest }: { guest: AdminBookingGuest }) {
  const phoneHref = bookingPhoneHref(guest.phone)
  const emailHref = bookingEmailHref(guest.email)
  const profileTo = bookingGuestProfilePath(guest.id)

  return (
    <BookingWorkspaceSection title="Гість">
      <p className="text-sm font-medium">{adminGuestName(guest)}</p>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Телефон</p>
        {phoneHref && guest.phone ? (
          <a className="inline-flex min-h-8 items-center gap-2 text-sm hover:underline" href={phoneHref}>
            <Phone className="size-3.5 shrink-0 text-muted" aria-hidden />
            {guest.phone}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Електронна пошта</p>
        {emailHref && guest.email ? (
          <a className="inline-flex min-h-8 items-center gap-2 break-all text-sm hover:underline" href={emailHref}>
            <Mail className="size-3.5 shrink-0 text-muted" aria-hidden />
            {guest.email}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
      <Link
        to={profileTo}
        className="inline-flex min-h-8 items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <UserRound className="size-3.5 shrink-0" aria-hidden />
        Картка клієнта
      </Link>
    </BookingWorkspaceSection>
  )
}
