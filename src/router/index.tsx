import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthRestoreState, PageSkeleton } from '@/components/ui/page-status'
import { SLOW_AUTH_MS } from '@/lib/session-policy'

const DashboardPage = lazy(async () => ({ default: (await import('@/pages/dashboard/DashboardPage')).DashboardPage }))
const BookingsPage = lazy(async () => ({ default: (await import('@/pages/bookings/BookingsPage')).BookingsPage }))
const BookingFormPage = lazy(async () => ({ default: (await import('@/pages/bookings/BookingFormPage')).BookingFormPage }))
const BookingDetailPage = lazy(async () => ({ default: (await import('@/pages/bookings/BookingDetailPage')).BookingDetailPage }))
const CalendarPage = lazy(async () => ({ default: (await import('@/pages/calendar/CalendarPage')).CalendarPage }))
const GuestsPage = lazy(async () => ({ default: (await import('@/pages/guests/GuestsPage')).GuestsPage }))
const GuestPage = lazy(async () => ({ default: (await import('@/pages/guests/GuestPage')).GuestPage }))
const AccommodationsPage = lazy(async () => ({ default: (await import('@/pages/accommodations/AccommodationsPage')).AccommodationsPage }))
const RatesPage = lazy(async () => ({ default: (await import('@/pages/rates/RatesPage')).RatesPage }))
const ServicesPage = lazy(async () => ({ default: (await import('@/pages/services/ServicesPage')).ServicesPage }))
const PromoCodesPage = lazy(async () => ({ default: (await import('@/pages/promo-codes/PromoCodesPage')).PromoCodesPage }))
const SettingsPage = lazy(async () => ({ default: (await import('@/pages/settings/SettingsPage')).SettingsPage }))
const UsersPage = lazy(async () => ({ default: (await import('@/pages/users/UsersPage')).UsersPage }))
const ProfilePage = lazy(async () => ({ default: (await import('@/pages/users/ProfilePage')).ProfilePage }))
const NotFoundPage = lazy(async () => ({ default: (await import('@/pages/NotFoundPage')).NotFoundPage }))

function RequireAuth() {
  const { user, isLoading, canRetryRestore, restoreError, retryRestore } = useAuth()
  const location = useLocation()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setSlow(false)
      return
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_AUTH_MS)
    return () => window.clearTimeout(timer)
  }, [isLoading])

  if (canRetryRestore) {
    return <AuthRestoreState error={restoreError} onRetry={retryRestore} />
  }
  if (isLoading) {
    return <AuthRestoreState slow={slow} />
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminLayout />
    </Suspense>
  )
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      path: '/admin',
      element: <RequireAuth />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'bookings', element: <BookingsPage /> },
        { path: 'bookings/new', element: <BookingFormPage /> },
        { path: 'bookings/:id', element: <BookingDetailPage /> },
        { path: 'bookings/:id/edit', element: <BookingFormPage /> },
        { path: 'calendar', element: <CalendarPage /> },
        { path: 'guests', element: <GuestsPage /> },
        { path: 'guests/:id', element: <GuestPage /> },
        { path: 'accommodations', element: <AccommodationsPage /> },
        { path: 'rates', element: <RatesPage /> },
        { path: 'services', element: <ServicesPage /> },
        { path: 'promo-codes', element: <PromoCodesPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'users', element: <UsersPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    { path: '/', element: <Navigate to="/admin" replace /> },
    { path: '*', element: <Navigate to="/admin" replace /> },
  ],
  { basename: basename || undefined },
)
