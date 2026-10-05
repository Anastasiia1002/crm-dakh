import type {
  AccommodationKind,
  BookingSource,
  BookingStatus,
  DiscountType,
  PaymentMethod,
  PaymentStatus,
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
  receptionist: 'Ресепшен',
}

export const HOLDING_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN']
