import { nightsBetween } from '@/lib/dates'
import { nightsLabel } from '@/lib/format'
import type { AdminBookingDetail } from '@/types'

export function bookingStayNightCount(checkIn: string, checkOut: string) {
  return nightsBetween(checkIn, checkOut)
}

export function bookingStayNightCopy(checkIn: string, checkOut: string) {
  return nightsLabel(bookingStayNightCount(checkIn, checkOut))
}

export function bookingGuestProfilePath(guestId: string) {
  return `/admin/guests/${encodeURIComponent(guestId)}`
}

export function bookingPhoneHref(phone: string | null | undefined) {
  const digits = phone?.replace(/[^\d+]/g, '') ?? ''
  return digits.length >= 10 ? `tel:${digits}` : null
}

export function bookingEmailHref(email: string | null | undefined) {
  const value = email?.trim() ?? ''
  return value.includes('@') ? `mailto:${value}` : null
}

/** Fields the workspace is allowed to show from GET /api/admin/bookings/:id. */
export function bookingWorkspaceHasNotes(booking: Pick<AdminBookingDetail, 'notes'>) {
  return Boolean(booking.notes?.trim())
}

export function bookingWorkspaceHasCancellation(booking: Pick<AdminBookingDetail, 'cancellationReason' | 'cancelledAt'>) {
  return Boolean(booking.cancellationReason?.trim() || booking.cancelledAt)
}
