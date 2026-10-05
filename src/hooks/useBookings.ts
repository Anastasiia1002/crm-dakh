import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import type { BookingFilters, BookingStatus, BookingWriteInput, PaymentMethod, PaymentStatus } from '@/types'

export function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => getBookings(filters),
  })
}

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
