import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelAdminBooking,
  checkInAdminBooking,
  checkOutAdminBooking,
  confirmAdminBooking,
  createAdminBooking,
  getAdminBooking,
  listAdminBookingGuests,
  listAdminBookings,
  noShowAdminBooking,
  quoteAdminBooking,
  updateAdminBooking,
} from '@/api/admin-bookings'
import {
  createBooking,
  getBooking,
  getBookings,
  getDashboard,
  getGuests,
  setBookingStatus,
  updateBooking,
  updatePayment,
} from '@/api/bookings'
import { toAdminBookingListQuery } from '@/lib/admin-booking-view'
import type {
  AdminBookingCancelInput,
  AdminBookingCreateInput,
  AdminBookingListFilters,
  AdminBookingQuoteInput,
  AdminBookingUpdateInput,
  BookingFilters,
  BookingStatus,
  BookingWriteInput,
  PaymentMethod,
  PaymentStatus,
} from '@/types'

export const adminBookingsQueryKey = ['admin-bookings'] as const
export const adminBookingQueryKey = (id: string) => ['admin-booking', id] as const
export const adminBookingGuestsQueryKey = ['admin-booking-guests'] as const

/** Real admin booking list — GET /api/admin/bookings */
export function useAdminBookings(filters: AdminBookingListFilters, options?: { enabled?: boolean }) {
  const query = toAdminBookingListQuery(filters)
  return useQuery({
    queryKey: [...adminBookingsQueryKey, query],
    queryFn: ({ signal }) => listAdminBookings(query, signal),
    enabled: options?.enabled ?? true,
  })
}

/** Real admin booking detail — GET /api/admin/bookings/:id */
export function useAdminBooking(id: string) {
  return useQuery({
    queryKey: adminBookingQueryKey(id),
    queryFn: ({ signal }) => getAdminBooking(id, signal),
    enabled: Boolean(id),
  })
}

export function useAdminBookingGuests(search: string, options?: { enabled?: boolean }) {
  const trimmed = search.trim()
  return useQuery({
    queryKey: [...adminBookingGuestsQueryKey, trimmed],
    queryFn: ({ signal }) =>
      listAdminBookingGuests({ page: 1, limit: 20, search: trimmed || undefined }, signal),
    enabled: options?.enabled ?? true,
  })
}

export function useAdminBookingQuote(input: AdminBookingQuoteInput | null) {
  return useQuery({
    queryKey: ['admin-booking-quote', input],
    queryFn: ({ signal }) => quoteAdminBooking(input!, signal),
    enabled: Boolean(input),
    retry: false,
  })
}

export function invalidateAdminBookingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: adminBookingsQueryKey })
  void queryClient.invalidateQueries({ queryKey: ['admin-booking'] })
  void queryClient.invalidateQueries({ queryKey: adminBookingGuestsQueryKey })
  void queryClient.invalidateQueries({ queryKey: ['admin-calendar'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-calendar-bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-booking-quote'] })
}

function useInvalidateAdminMutations() {
  const queryClient = useQueryClient()
  return () => invalidateAdminBookingQueries(queryClient)
}

export function useCreateAdminBooking() {
  const invalidate = useInvalidateAdminMutations()
  return useMutation({
    mutationFn: (input: AdminBookingCreateInput) => createAdminBooking(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdminBooking(id: string) {
  const invalidate = useInvalidateAdminMutations()
  return useMutation({
    mutationFn: (input: AdminBookingUpdateInput) => updateAdminBooking(id, input),
    onSuccess: invalidate,
  })
}

export function useAdminBookingStatus(id: string) {
  const invalidate = useInvalidateAdminMutations()
  return useMutation({
    mutationFn: async (input: {
      action: 'confirm' | 'check-in' | 'check-out' | 'no-show' | 'cancel'
      cancel?: AdminBookingCancelInput
    }) => {
      if (input.action === 'confirm') return confirmAdminBooking(id)
      if (input.action === 'check-in') return checkInAdminBooking(id)
      if (input.action === 'check-out') return checkOutAdminBooking(id)
      if (input.action === 'no-show') return noShowAdminBooking(id)
      return cancelAdminBooking(id, input.cancel ?? {})
    },
    onSuccess: invalidate,
  })
}

/** @deprecated Mock list — dashboard / legacy only. Prefer useAdminBookings. */
export function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => getBookings(filters),
  })
}

/** @deprecated Mock detail — legacy form only. Prefer useAdminBooking. */
export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBooking(id),
    enabled: Boolean(id),
  })
}

export function useGuests() {
  return useQuery({
    queryKey: ['guests'],
    queryFn: getGuests,
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })
}

function useInvalidateBookings() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    void queryClient.invalidateQueries({ queryKey: ['booking'] })
    invalidateAdminBookingQueries(queryClient)
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['guests'] })
    void queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
    void queryClient.invalidateQueries({ queryKey: ['audit'] })
  }
}

export function useCreateBooking() {
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: (input: BookingWriteInput) => createBooking(input),
    onSuccess: invalidate,
  })
}

export function useUpdateBooking(id: string) {
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: (input: BookingWriteInput) => updateBooking(id, input),
    onSuccess: invalidate,
  })
}

export function useBookingStatus(id: string) {
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: ({ status, cancelReason }: { status: BookingStatus; cancelReason?: string }) =>
      setBookingStatus(id, status, cancelReason),
    onSuccess: invalidate,
  })
}

export function useUpdatePayment(id: string) {
  const invalidate = useInvalidateBookings()
  return useMutation({
    mutationFn: (input: { paymentStatus: PaymentStatus; paymentMethod: PaymentMethod | null }) =>
      updatePayment(id, input.paymentStatus, input.paymentMethod),
    onSuccess: invalidate,
  })
}
