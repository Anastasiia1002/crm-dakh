import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AccommodationsPage } from '@/pages/accommodations/AccommodationsPage'
import { BookingDetailPage } from '@/pages/bookings/BookingDetailPage'
import { BookingFormPage } from '@/pages/bookings/BookingFormPage'
import { BookingsPage } from '@/pages/bookings/BookingsPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { GuestPage } from '@/pages/guests/GuestPage'
import { GuestsPage } from '@/pages/guests/GuestsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PromoCodesPage } from '@/pages/promo-codes/PromoCodesPage'
import { RatesPage } from '@/pages/rates/RatesPage'
import { ServicesPage } from '@/pages/services/ServicesPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ProfilePage } from '@/pages/users/ProfilePage'
import { UsersPage } from '@/pages/users/UsersPage'

function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Завантаження…</div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <AdminLayout />
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createBrowserRouter([
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
], { basename: basename || undefined })
