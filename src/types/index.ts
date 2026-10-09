export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW'

export type BookingSource = 'website' | 'phone' | 'walk_in' | 'admin' | 'partner'

export type PaymentStatus = 'unpaid' | 'deposit' | 'paid' | 'refunded'

export type PaymentMethod = 'cash' | 'terminal' | 'invoice' | 'online'

/** Mock calendar filter only (`room` / `house`). Not the admin RoomType.kind API. */
export type AccommodationKind = 'room' | 'house'

/** Backend RoomType.kind — physical units inherit this via their category. */
export type RoomTypeKind = 'ROOM' | 'COTTAGE'

export type RoomStatus = 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'INACTIVE'

export type RoomBlockType = 'MAINTENANCE' | 'OWNER_USE' | 'OTHER'

export type ServiceUnit = 'per_stay' | 'per_night' | 'per_person'

export type DiscountType = 'percent' | 'fixed'

export type UserRole = 'owner' | 'admin' | 'manager' | 'receptionist'

export type Guest = {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  country: string
  city: string
  notes: string
  createdAt: string
}

export type GuestStatus = 'new' | 'regular'

export type GuestCountryFilter = 'all' | 'Україна' | 'Румунія' | 'Польща' | 'Німеччина' | 'other'

export type GuestBookingCountFilter = 'all' | '1' | '2-5' | '6+'

export type GuestLastBookingFilter = 'any' | '30d' | '3m' | '1y'

export type GuestFilters = {
  search?: string
  country?: GuestCountryFilter
  status?: 'all' | GuestStatus
  bookings?: GuestBookingCountFilter
  lastBooking?: GuestLastBookingFilter
  page?: number
  pageSize?: number
}

export type GuestStats = {
  bookingsCount: number
  completedStays: number
  totalNights: number
  totalSpent: number
  lastBookingDate: string | null
}

export type GuestListItem = Guest & GuestStats & { status: GuestStatus }

export type GuestSummary = {
  totalGuests: number
  newGuests: number
  withBookings: number
  returningGuests: number
}

export type GuestListResult = {
  items: GuestListItem[]
  total: number
  page: number
  pageSize: number
  summary: GuestSummary
}

export type GuestBookingHistory = {
  id: string
  number: string
  checkIn: string
  checkOut: string
  accommodationName: string
  ratePlanName: string
  adults: number
  children: number
  status: BookingStatus
  totalAmount: number
}

export type GuestProfile = {
  guest: Guest
  stats: GuestStats
  history: GuestBookingHistory[]
}

export type GuestImportError = {
  row: number
  message: string
}

export type GuestImportResult = {
  totalRows: number
  created: number
  existing: number
  skipped: number
  errors: GuestImportError[]
}

export type GuestWriteInput = {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  city: string
  notes: string
}

/** Room category (backend RoomType). */
export type RoomType = {
  id: string
  name: string
  slug: string
  description: string | null
  kind: RoomTypeKind
  maxGuests: number
  active: boolean
  createdAt: string
  updatedAt: string
  /** Mock-only until rates API; ignored by accommodation admin API. */
  basePrice?: number
}

/**
 * Physical room or cottage unit (backend Room).
 * Kind is inherited from RoomType — there is no Room.kind field.
 */
export type Accommodation = {
  id: string
  roomTypeId: string
  number: string
  name: string | null
  floor: number | null
  status: RoomStatus
  active: boolean
  createdAt: string
  updatedAt: string
  /** Mock-only calendar filter (`room`/`house`) until bookings/calendar migrate. */
  kind?: AccommodationKind
}

/** Unavailable range [startDate, endDate) in YYYY-MM-DD. */
export type Block = {
  id: string
  roomId: string
  startDate: string
  endDate: string
  type: RoomBlockType
  reason: string | null
  createdAt: string
  updatedAt: string
}

export type RoomTypeImage = {
  id: string
  roomTypeId: string
  url: string
  alt: string | null
  sortOrder: number
  createdAt: string
}

export type AccommodationPage<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type RoomTypeListQuery = {
  page?: number
  limit?: number
  search?: string
  active?: boolean
  kind?: RoomTypeKind
}

export type RoomListQuery = {
  page?: number
  limit?: number
  search?: string
  active?: boolean
  roomTypeId?: string
  status?: RoomStatus
  kind?: RoomTypeKind
}

export type RoomTypeCreateInput = {
  name: string
  slug: string
  description?: string | null
  kind: RoomTypeKind
  maxGuests: number
  active?: boolean
}

export type RoomTypeUpdateInput = {
  name?: string
  slug?: string
  description?: string | null
  kind?: RoomTypeKind
  maxGuests?: number
  active?: boolean
}

export type RoomCreateInput = {
  roomTypeId: string
  number: string
  name?: string | null
  floor?: number | null
  status?: RoomStatus
  active?: boolean
}

export type RoomUpdateInput = {
  roomTypeId?: string
  number?: string
  name?: string | null
  floor?: number | null
  status?: RoomStatus
  active?: boolean
}

export type RoomBlockCreateInput = {
  startDate: string
  endDate: string
  type: RoomBlockType
  reason?: string | null
}

export type RoomBlockUpdateInput = {
  startDate?: string
  endDate?: string
  type?: RoomBlockType
  reason?: string | null
}

export type RoomImageCreateInput = {
  url: string
  alt?: string | null
  sortOrder?: number
}

export type RoomImageUpdateInput = {
  url?: string
  alt?: string | null
  sortOrder?: number
}

export type Booking = {
  id: string
  number: string
  guestId: string
  accommodationId: string
  ratePlanId: string
  checkIn: string
  checkOut: string
  checkInTime: string
  checkOutTime: string
  adults: number
  children: number
  status: BookingStatus
  source: BookingSource
  serviceIds: string[]
  promoCodeId: string | null
  accommodationAmount: number
  servicesAmount: number
  discountAmount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  notes: string
  cancelReason: string | null
  createdAt: string
  updatedAt: string
}

export type RatePlan = {
  id: string
  name: string
  description: string
  cancellationPolicyId: string
  active: boolean
}

export type PricePeriod = {
  id: string
  ratePlanId: string
  roomTypeId: string
  startDate: string
  endDate: string
  pricePerNight: number
}

export type Service = {
  id: string
  name: string
  description: string
  price: number
  unit: ServiceUnit
  active: boolean
}

export type PromoCode = {
  id: string
  code: string
  description: string
  discountType: DiscountType
  discountValue: number
  validFrom: string
  validTo: string
  usageLimit: number | null
  usedCount: number
  active: boolean
}

export type CancellationRule = {
  daysBefore: number
  refundPercent: number
}

export type CancellationPolicy = {
  id: string
  name: string
  description: string
  rules: CancellationRule[]
}

export type AdminUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  active: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type AdminUserDetails = AdminUser & {
  activeSessionCount: number
}

export type AdminUserListQuery = {
  page?: number
  limit?: number
  search?: string
  role?: UserRole
  active?: boolean
}

export type AdminUserPage = {
  items: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type AdminUserCreateInput = {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  password: string
}

export type AdminUserUpdateInput = {
  email?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  active?: boolean
}

export type AuditEntry = {
  id: string
  actorId: string
  action: string
  entity: string
  entityId: string
  details: string
  createdAt: string
}

export type BookingSettings = {
  checkInTime: string
  checkOutTime: string
  minNights: number
  maxNights: number
  currency: 'UAH'
}

export type HotelSettings = {
  id: string
  name: string
  slug: string
  description: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  currency: string
  timezone: string
  checkInTime: string | null
  checkOutTime: string | null
  createdAt: string
  updatedAt: string
}

export type HotelSettingsUpdate = {
  name?: string
  slug?: string
  description?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  currency?: string
  timezone?: string
  checkInTime?: string | null
  checkOutTime?: string | null
}

export type HotelBookingSettings = {
  minAdvanceHours: number
  maxAdvanceDays: number | null
  defaultMinStay: number
  defaultMaxStay: number | null
  allowSameDayBooking: boolean
  allowCancellation: boolean
  cancellationHours: number | null
  createdAt: string
  updatedAt: string
}

export type HotelBookingSettingsUpdate = {
  minAdvanceHours?: number
  maxAdvanceDays?: number | null
  defaultMinStay?: number
  defaultMaxStay?: number | null
  allowSameDayBooking?: boolean
  allowCancellation?: boolean
  cancellationHours?: number | null
}

export type BookingFilters = {
  search?: string
  status?: BookingStatus | 'all'
  accommodationId?: string | 'all'
  source?: BookingSource | 'all'
  dateFrom?: string
  dateTo?: string
}

export type NewGuestInput = {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export type BookingWriteInput = {
  guestId?: string
  newGuest?: NewGuestInput
  accommodationId: string
  ratePlanId: string
  checkIn: string
  checkOut: string
  checkInTime: string
  adults: number
  children: number
  status: 'PENDING' | 'CONFIRMED'
  source: BookingSource
  serviceIds: string[]
  promoCode: string | null
  notes: string
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
}

export type PriceQuote = {
  nights: number
  accommodationAmount: number
  servicesAmount: number
  discountAmount: number
  totalAmount: number
  promoCodeId: string | null
}

export type DashboardSummary = {
  arrivalsToday: number
  departuresToday: number
  guestsInHouse: number
  availableRooms: number
  occupancyPercent: number
  arrivals: Booking[]
  departures: Booking[]
  upcoming: Booking[]
  pendingCount: number
}

export type NotificationItem = {
  id: string
  title: string
  description: string
}
