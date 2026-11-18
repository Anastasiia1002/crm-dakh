import type { CurrentPriceNight } from '@/types'

export const CURRENT_PRICES_MAX_NIGHTS = 62

export const CURRENT_PRICE_LABEL = {
  missing: 'Ціну не задано',
} as const

export function currentPriceAmount(night: CurrentPriceNight): string | null {
  if (night.missing) return null
  return night.amount
}
