import { nightsBetween } from '@/lib/dates'
import { normalizePhone, phonesMatch } from '@/lib/phone'
import { checkInPolicyError, stayLengthError, stayNightsAvailable, type BookingWindowRules, type NightAvailability } from '@/lib/stay-calendar'

export const NOTES_MAX = 2000
export const NAME_MAX = 100
const EMAIL_MAX = 200
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type GuestFields = {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export type GuestCard = GuestFields & { id: string }

export type FieldErrors = Partial<Record<'phone' | 'firstName' | 'lastName' | 'email' | 'checkIn' | 'checkOut' | 'roomId' | 'guestCount' | 'notes' | 'ratePlanId', string>>

export function validateGuestFields(fields: GuestFields): FieldErrors {
  const errors: FieldErrors = {}
  const phone = normalizePhone(fields.phone)
  if (!phone.ok) errors.phone = phone.error

  const firstName = fields.firstName.trim()
  const lastName = fields.lastName.trim()
  if (firstName.length < 2) errors.firstName = 'Вкажіть імʼя (щонайменше 2 символи).'
  else if (firstName.length > NAME_MAX) errors.firstName = `Імʼя має бути до ${NAME_MAX} символів.`
  if (lastName.length < 2) errors.lastName = 'Вкажіть прізвище (щонайменше 2 символи).'
  else if (lastName.length > NAME_MAX) errors.lastName = `Прізвище має бути до ${NAME_MAX} символів.`

  const email = fields.email.trim()
  if (email.length > EMAIL_MAX || (email && !EMAIL_PATTERN.test(email))) {
    errors.email = 'Вкажіть коректну електронну пошту або залиште поле порожнім.'
  }
  return errors
}

export function validateStayFields(input: {
  checkIn: string
  checkOut: string
  roomId: string
  roomActive: boolean
  ratePlanId: string
  guestCount: number
  maxGuests: number | null
  notes: string
  rules: BookingWindowRules | null
  nights: ReadonlyMap<string, NightAvailability> | null
  now?: Date
}): FieldErrors {
  const errors: FieldErrors = {}
  if (!input.checkIn) errors.checkIn = 'Оберіть дату заїзду.'
  if (!input.checkOut) errors.checkOut = 'Оберіть дату виїзду.'
  if (input.checkIn && input.checkOut && input.checkOut <= input.checkIn) {
    errors.checkOut = 'Виїзд має бути пізніше заїзду.'
  }
  if (input.checkIn && input.rules && !errors.checkIn) {
    const policy = checkInPolicyError(input.checkIn, input.rules, input.now)
    if (policy) errors.checkIn = policy
  }
  if (input.checkIn && input.checkOut && input.checkOut > input.checkIn && input.rules && !errors.checkOut) {
    const lengthError = stayLengthError(input.checkIn, input.checkOut, input.rules)
    if (lengthError) errors.checkOut = lengthError
  }
  if (input.checkIn && input.checkOut && input.checkOut > input.checkIn && input.nights) {
    if (!stayNightsAvailable(input.checkIn, input.checkOut, input.nights)) {
      errors.checkOut = 'Обраний період перетинається із зайнятою або недоступною ніччю.'
    }
  }
  if (!input.roomId) errors.roomId = 'Оберіть активне розміщення.'
  else if (!input.roomActive) errors.roomId = 'Це розміщення вимкнене. Оберіть активне.'
  if (!input.ratePlanId) errors.ratePlanId = 'Оберіть тариф.'
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    errors.guestCount = 'Вкажіть кількість гостей (щонайменше 1).'
  } else if (input.maxGuests !== null && input.guestCount > input.maxGuests) {
    errors.guestCount = `Для цього розміщення максимум ${input.maxGuests} гостей.`
  }
  if (input.notes.trim().length > NOTES_MAX) errors.notes = `Примітки мають бути до ${NOTES_MAX} символів.`
  return errors
}

export function hasFieldErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0
}

function samePhone(left: string, right: string) {
  const a = normalizePhone(left)
  const b = normalizePhone(right)
  if (a.ok && b.ok) return a.e164 === b.e164
  return phonesMatch(left, b.ok ? b.e164 : right) || phonesMatch(right, a.ok ? a.e164 : left)
}

export type GuestFillResult = {
  fields: GuestFields
  conflicts: Array<keyof GuestFields>
}

/** Fill only when the user confirms, and never when an edited value differs. */
export function proposeGuestFill(current: GuestFields, guest: GuestCard): GuestFillResult {
  const conflicts: Array<keyof GuestFields> = []
  const next: GuestFields = { ...current }

  const pairs: Array<[keyof GuestFields, string]> = [
    ['firstName', guest.firstName.trim()],
    ['lastName', guest.lastName.trim()],
    ['email', guest.email.trim()],
    ['phone', guest.phone.trim()],
  ]
  for (const [key, incoming] of pairs) {
    const existing = current[key].trim()
    if (!incoming) continue
    if (!existing) {
      next[key] = incoming
      continue
    }
    const same = key === 'phone' ? samePhone(existing, incoming) : existing === incoming
    if (!same) conflicts.push(key)
  }
  return { fields: next, conflicts }
}

export function applyGuestFill(current: GuestFields, guest: GuestCard, replace: boolean): GuestFields {
  if (!replace) return proposeGuestFill(current, guest).fields
  return {
    firstName: guest.firstName.trim() || current.firstName,
    lastName: guest.lastName.trim() || current.lastName,
    email: guest.email.trim() || current.email,
    phone: guest.phone.trim() || current.phone,
  }
}

export function createSubmitLock() {
  let locked = false
  return {
    tryBegin() {
      if (locked) return false
      locked = true
      return true
    },
    end() {
      locked = false
    },
  }
}

export function bookingConflictMessage() {
  return 'Ці дати вже зайняті або заблоковані. Оберіть інший період.'
}

export function stayNightCount(checkIn: string, checkOut: string) {
  if (!(checkOut > checkIn)) return 0
  return nightsBetween(checkIn, checkOut)
}
