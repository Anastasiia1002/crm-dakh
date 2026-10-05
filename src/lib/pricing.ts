import { nightsBetween, stayOverlaps } from '@/lib/dates'
import type { PricePeriod, PriceQuote, PromoCode, Service } from '@/types'

export function priceForNight(
  date: string,
  ratePlanId: string,
  roomTypeId: string,
  periods: PricePeriod[],
  fallback: number,
) {
  const nightEnd = date
  const matches = periods.filter(
    (period) =>
      period.ratePlanId === ratePlanId &&
      period.roomTypeId === roomTypeId &&
      stayOverlaps(date, addOne(nightEnd), period.startDate, period.endDate),
  )
  if (matches.length === 0) return fallback
  return matches.sort((a, b) => b.startDate.localeCompare(a.startDate))[0].pricePerNight
}

function addOne(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1)
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function serviceAmount(service: Service, nights: number, people: number) {
  if (service.unit === 'per_night') return service.price * nights
  if (service.unit === 'per_person') return service.price * people
  return service.price
}

export function quoteStay(input: {
  checkIn: string
  checkOut: string
  ratePlanId: string
  roomTypeId: string
  basePrice: number
  periods: PricePeriod[]
  services: Service[]
  serviceIds: string[]
  adults: number
  children: number
  promo: PromoCode | null
}): PriceQuote {
  const nights = Math.max(0, nightsBetween(input.checkIn, input.checkOut))
  let accommodationAmount = 0
  if (nights > 0) {
    for (let index = 0; index < nights; index += 1) {
      const [year, month, day] = input.checkIn.split('-').map(Number)
      const date = new Date(year, month - 1, day + index)
      const m = `${date.getMonth() + 1}`.padStart(2, '0')
      const d = `${date.getDate()}`.padStart(2, '0')
      const iso = `${date.getFullYear()}-${m}-${d}`
      accommodationAmount += priceForNight(
        iso,
        input.ratePlanId,
        input.roomTypeId,
        input.periods,
        input.basePrice,
      )
    }
  }

  const people = input.adults + input.children
  const servicesAmount = input.services
    .filter((service) => input.serviceIds.includes(service.id) && service.active)
    .reduce((sum, service) => sum + serviceAmount(service, nights, people), 0)

  const beforeDiscount = accommodationAmount + servicesAmount
  let discountAmount = 0
  if (input.promo && nights > 0) {
    discountAmount =
      input.promo.discountType === 'percent'
        ? Math.round((beforeDiscount * input.promo.discountValue) / 100)
        : Math.min(beforeDiscount, input.promo.discountValue)
  }

  return {
    nights,
    accommodationAmount,
    servicesAmount,
    discountAmount,
    totalAmount: Math.max(0, beforeDiscount - discountAmount),
    promoCodeId: input.promo?.id ?? null,
  }
}
