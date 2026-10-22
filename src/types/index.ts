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

export type RatePlanType = 'STANDARD' | 'NON_REFUNDABLE' | 'SPECIAL'

/** Admin RatePlan (backend). Mock bookings use the same shape with seeded fields. */
export type RatePlan = {
  id: string
  name: string
  code: string
  description: string | null
  type: RatePlanType
  cancellationPolicyId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

/** Mock booking seasonal prices (`pricePerNight` number). Admin uses RoomPrice. */
export type PricePeriod = {
  id: string
  ratePlanId: string
  roomTypeId: string
  startDate: string
  endDate: string
  pricePerNight: number
}

/** Admin RoomPrice — `price` is a decimal string, never a JS number for money math. */
export type RoomPrice = {
  id: string
  ratePlanId: string
  roomTypeId: string
  startDate: string
  endDate: string
  price: string
  minStay: number
  maxStay: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type RatesPage<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type RatePlanListQuery = {
  page?: number
  limit?: number
  search?: string
  type?: RatePlanType
  active?: boolean
}

export type CancellationPolicyListQuery = {
  page?: number
  limit?: number
  search?: string
  active?: boolean
}

export type RoomPriceListQuery = {
  page?: number
  limit?: number
  ratePlanId?: string
  roomTypeId?: string
  active?: boolean
  startDate?: string
  endDate?: string
}

export type RatePlanCreateInput = {
  name: string
  code: string
  description?: string | null
  type?: RatePlanType
  cancellationPolicyId?: string | null
  active?: boolean
}

export type RatePlanUpdateInput = {
  name?: string
  code?: string
  description?: string | null
  type?: RatePlanType
  cancellationPolicyId?: string | null
  active?: boolean
}

export type CancellationPolicyCreateInput = {
  name: string
  description?: string | null
  hoursBefore: number
  penaltyAmount?: string | null
  penaltyPercent?: string | null
  active?: boolean
}

export type CancellationPolicyUpdateInput = {
  name?: string
  description?: string | null
  hoursBefore?: number
  penaltyAmount?: string | null
  penaltyPercent?: string | null
  active?: boolean
}

export type RoomPriceCreateInput = {
  ratePlanId: string
  roomTypeId: string
  startDate: string
  endDate: string
  price: string
  minStay?: number
  maxStay?: number | null
  active?: boolean
}

export type RoomPriceUpdateInput = {
  ratePlanId?: string
  roomTypeId?: string
  startDate?: string
  endDate?: string
  price?: string
  minStay?: number
  maxStay?: number | null
  active?: boolean
}

/** Type-level weekday/weekend overlay. Applies to every physical room of the category. */
export type DayPriceRule = {
  id: string
  hotelId: string
  ratePlanId: string
  roomTypeId: string
  name: string
  weekdayPrice: string
  weekendPrice: string
  weekendDays: number[]
  startDate: string
  endDate: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type DayPriceRuleListQuery = {
  page?: number
  limit?: number
  ratePlanId?: string
  roomTypeId?: string
  active?: boolean
}

export type DayPriceRuleCreateInput = {
  name: string
  ratePlanId: string
  roomTypeId: string
  weekdayPrice: string
  weekendPrice: string
  weekendDays?: number[]
  startDate: string
  endDate: string
  active?: boolean
}

export type DayPriceRuleUpdateInput = {
  name?: string
  ratePlanId?: string
  roomTypeId?: string
  weekdayPrice?: string
  weekendPrice?: string
  weekendDays?: number[]
  startDate?: string
  endDate?: string
  active?: boolean
}

export type DayPricePreview = {
  nights: { date: string; weekday: number; weekend: boolean; basePrice: string; price: string }[]
  roomSubtotal: string
}

export type LengthStayDiscount = {
  id: string
  name: string
  minNights: number
  discountType: 'PERCENTAGE'
  discountValue: string
  active: boolean
  roomTypeIds: string[]
  createdAt: string
  updatedAt: string
}

export type LengthStayDiscountListQuery = {
  page?: number
  limit?: number
  active?: boolean
}

export type LengthStayDiscountCreateInput = {
  name: string
  minNights: number
  discountValue: string
  roomTypeIds?: string[]
  active?: boolean
}

export type LengthStayDiscountUpdateInput = {
  name?: string
  minNights?: number
  discountValue?: string
  roomTypeIds?: string[]
  active?: boolean
}

export type LengthStayPreview = {
  nights: number
  roomSubtotal: string
  discountAmount: string
  payable: string
  ruleId: string | null
  ruleName: string | null
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

/** @deprecated Mock-only ladder; bookings still seed this until booking rates migrate. */
export type CancellationRule = {
  daysBefore: number
  refundPercent: number
}

/**
 * Admin CancellationPolicy (backend).
 * Mock bookings keep a parallel `MockCancellationPolicy` in mocks until booking phase migrates.
 */
export type CancellationPolicy = {
  id: string
  name: string
  description: string | null
  hoursBefore: number
  penaltyAmount: string | null
  penaltyPercent: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

/** Mock booking policy with refund ladder — not the admin API shape. */
export type MockCancellationPolicy = {
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

/** Backend availability calendar night state. */
export type CalendarNightState =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'BLOCKED'
  | 'CHECKED_IN'
  | 'MAINTENANCE'
  | 'OUT_OF_ORDER'
  | 'INACTIVE'

export type AdminCalendarNight = {
  date: string
  state: CalendarNightState
  bookingId: string | null
  blockId: string | null
}

export type AdminCalendarRoom = {
  roomId: string
  number: string
  status: RoomStatus
  active: boolean
  nights: AdminCalendarNight[]
}

export type AdminCalendarRoomType = {
  roomTypeId: string
  name: string
  rooms: AdminCalendarRoom[]
}

export type AdminCalendarView = {
  from: string
  to: string
  roomTypes: AdminCalendarRoomType[]
}

export type AdminCalendarQuery = {
  from: string
  to: string
  roomTypeId?: string
  /** When set, backend returns only matching active/inactive inventory. */
  active?: boolean
}

/** Backend admin booking list source enum. */
export type AdminBookingSource = 'WEBSITE' | 'ADMIN' | 'PHONE' | 'EMAIL' | 'OTHER'

export type AdminBookingGuest = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  country: string | null
  city: string | null
}

export type AdminBookingRoom = {
  roomId: string
  number: string
  roomTypeId: string
  roomTypeName: string
  ratePlanId: string
}

export type AdminBookingListItem = {
  id: string
  status: BookingStatus
  source: AdminBookingSource
  checkIn: string
  checkOut: string
  adults: number
  children: number
  guestCount: number
  promoCodeId: string | null
  createdAt: string
  guest: AdminBookingGuest
  rooms: AdminBookingRoom[]
  totalAmount: string
  currency: string
}

export type AdminBookingNight = {
  id: string
  roomId: string
  date: string
  price: string
  currency: string
}

export type AdminBookingServiceLine = {
  id: string
  serviceId: string
  quantity: number
  unitPrice: string
  totalPrice: string
}

export type AdminBookingPrice = {
  roomSubtotal: string
  servicesTotal: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  currency: string
}

/** GET /api/admin/bookings/:id — list fields plus detail enrichment. */
export type AdminBookingDetail = AdminBookingListItem & {
  notes: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  nights: AdminBookingNight[]
  price: AdminBookingPrice
  services: AdminBookingServiceLine[]
}

export type AdminBookingListQuery = {
  page?: number
  limit?: number
  status?: BookingStatus
  source?: AdminBookingSource
  id?: string
  roomId?: string
  roomTypeId?: string
  /** Window start for overlap filter (with checkOut). */
  checkIn?: string
  /** Window end for overlap filter (with checkIn). */
  checkOut?: string
  createdFrom?: string
  createdTo?: string
  search?: string
}

export type AdminBookingPage = AccommodationPage<AdminBookingListItem>

/** UI filters for admin booking list (mapped to AdminBookingListQuery). */
export type AdminBookingListFilters = {
  page: number
  limit: number
  search: string
  status: BookingStatus | 'all'
  source: AdminBookingSource | 'all'
  roomId: string | 'all'
  /** Stay overlap window start — requires checkOut. */
  checkIn: string
  /** Stay overlap window end — requires checkIn. */
  checkOut: string
}

export type AdminBookingGuestInput = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  country?: string
  city?: string
}

export type AdminBookingRoomInput = {
  roomId: string
  ratePlanId: string
}

/** POST /api/admin/bookings — no client totals/prices. */
export type AdminBookingCreateInput = {
  guestId?: string
  guest?: AdminBookingGuestInput
  checkIn: string
  checkOut: string
  adults?: number
  children?: number
  guestCount: number
  notes?: string
  source?: AdminBookingSource
  status?: 'PENDING' | 'CONFIRMED'
  rooms: AdminBookingRoomInput[]
  /** Server id from a successful quote. The client does not send a discount amount. */
  promoCodeId?: string
}

/** PATCH /api/admin/bookings/:id */
export type AdminBookingUpdateInput = {
  guestId?: string
  guest?: {
    firstName?: string
    lastName?: string
    email?: string | null
    phone?: string | null
    country?: string | null
    city?: string | null
  }
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  guestCount?: number
  notes?: string | null
  rooms?: AdminBookingRoomInput[]
  /** Null clears a stored promo. Omitted leaves it unchanged. */
  promoCodeId?: string | null
}

export type AdminBookingCancelInput = {
  cancellationReason?: string
}

export type AdminBookingQuoteInput = {
  checkIn: string
  checkOut: string
  guestCount: number
  rooms: AdminBookingRoomInput[]
  /** Edit preview: the backend ignores this booking's own occupancy and keeps its service and promo snapshot. */
  excludeBookingId?: string
  /** Empty string on an edit asks the quote to drop the stored promo. */
  promoCode?: string
}

export type AdminBookingQuoteNight = {
  date: string
  price: string
  currency: string
}

export type AdminBookingQuoteRoom = {
  roomId: string
  ratePlanId: string
  nights: AdminBookingQuoteNight[]
  roomSubtotal: string
}

export type AdminBookingQuote = {
  checkIn: string
  checkOut: string
  guestCount: number
  currency: string
  rooms: AdminBookingQuoteRoom[]
  services: { serviceId: string; quantity: number; unitPrice: string; totalPrice: string }[]
  promoCodeId: string | null
  price: AdminBookingPrice
  pricing?: {
    accommodationSubtotal: string
    automaticDiscount: string
    promoDiscount: string
    appliedDiscount: string
    appliedSource: 'NONE' | 'AUTOMATIC' | 'PROMO'
  }
}

export type AdminBookingGuestSelection = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
}

export type AdminBookingGuestSelectionPage = AccommodationPage<AdminBookingGuestSelection>

export type AdminBookingStatusAction = 'confirm' | 'check-in' | 'check-out' | 'no-show' | 'cancel'

export type ChessboardBookingBar = {
  bookingId: string
  roomId: string
  startDate: string
  endDate: string
  status: BookingStatus | 'UNKNOWN'
  label: string
  metadataMissing: boolean
}

export type ChessboardAdminBar = {
  key: string
  roomId: string
  startDate: string
  endDate: string
  kind: 'BLOCKED' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'INACTIVE'
  blockId: string | null
  label: string
}

export type ChessboardRoomRow = {
  roomId: string
  number: string
  roomTypeId: string
  roomTypeName: string
  kind: RoomTypeKind | 'UNKNOWN'
  status: RoomStatus
  active: boolean
  nights: AdminCalendarNight[]
}

export type ChessboardGroup = {
  roomTypeId: string
  name: string
  kind: RoomTypeKind | 'UNKNOWN'
  rooms: ChessboardRoomRow[]
}

export type ChessboardModel = {
  from: string
  to: string
  dates: string[]
  groups: ChessboardGroup[]
  bookingBars: ChessboardBookingBar[]
  adminBars: ChessboardAdminBar[]
  missingBookingIds: string[]
  /** RoomType ids present on the calendar but missing kind metadata. */
  unresolvedRoomTypeIds: string[]
}
