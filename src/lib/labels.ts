import type {
  AccommodationKind,
  BookingSource,
  BookingStatus,
  DiscountType,
  PaymentMethod,
  PaymentStatus,
  RatePlanType,
  RoomBlockType,
  RoomStatus,
  RoomTypeKind,
  ServiceUnit,
  UserRole,
} from '@/types'

export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: 'Очікує підтвердження',
  CONFIRMED: 'Підтверджено',
  CHECKED_IN: 'Заселено',
  CHECKED_OUT: 'Виселено',
  CANCELLED: 'Скасовано',
  NO_SHOW: 'Не заїхав',
}

export const bookingSourceLabel: Record<BookingSource, string> = {
  website: 'Сайт',
  phone: 'Телефон',
  walk_in: 'Стійка',
  admin: 'Адмінпанель',
  partner: 'Партнер',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: 'Не оплачено',
  deposit: 'Передплата',
  paid: 'Оплачено',
  refunded: 'Повернено',
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Готівка',
  terminal: 'Термінал',
  invoice: 'Рахунок',
  online: 'Онлайн',
}

export const accommodationKindLabel: Record<AccommodationKind, string> = {
  room: 'Номер',
  house: 'Будиночок',
}

export const roomTypeKindLabel: Record<RoomTypeKind, string> = {
  ROOM: 'Номер',
  COTTAGE: 'Будиночок',
}

export const ratePlanTypeLabel: Record<RatePlanType, string> = {
  STANDARD: 'Стандартний',
  NON_REFUNDABLE: 'Без повернення',
  SPECIAL: 'Спеціальний',
}

export const roomStatusLabel: Record<RoomStatus, string> = {
  AVAILABLE: 'Вільний',
  MAINTENANCE: 'Обслуговування',
  OUT_OF_ORDER: 'Не працює',
  INACTIVE: 'Неактивний',
}

export const roomBlockTypeLabel: Record<RoomBlockType, string> = {
  MAINTENANCE: 'Обслуговування',
  OWNER_USE: 'Використання власником',
  OTHER: 'Інше',
}

export const serviceUnitLabel: Record<ServiceUnit, string> = {
  per_stay: 'За проживання',
  per_night: 'За ніч',
  per_person: 'За гостя',
}

export const discountTypeLabel: Record<DiscountType, string> = {
  percent: 'Відсоток',
  fixed: 'Фіксована сума',
}

export const userRoleLabel: Record<UserRole, string> = {
  owner: 'Власник',
  admin: 'Адміністратор',
  manager: 'Менеджер',
  receptionist: 'Ресепшен',
}

export const HOLDING_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN']
