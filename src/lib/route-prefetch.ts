const loaders: Record<string, () => Promise<unknown>> = {
  '/admin': () => import('@/pages/dashboard/DashboardPage'),
  '/admin/bookings': () => import('@/pages/bookings/BookingsPage'),
  '/admin/calendar': () => import('@/pages/calendar/CalendarPage'),
  '/admin/guests': () => import('@/pages/guests/GuestsPage'),
  '/admin/accommodations': () => import('@/pages/accommodations/AccommodationsPage'),
  '/admin/rates': () => import('@/pages/rates/RatesPage'),
  '/admin/services': () => import('@/pages/services/ServicesPage'),
  '/admin/promo-codes': () => import('@/pages/promo-codes/PromoCodesPage'),
  '/admin/settings': () => import('@/pages/settings/SettingsPage'),
  '/admin/users': () => import('@/pages/users/UsersPage'),
  '/admin/analytics': () => import('@/pages/analytics/AnalyticsPage'),
}

export function prefetchAdminRoute(to: string) {
  const exact = loaders[to]
  if (exact) {
    void exact()
    return
  }
  const prefix = Object.keys(loaders).find((path) => path !== '/admin' && to.startsWith(`${path}/`))
  if (prefix) void loaders[prefix]()
}
