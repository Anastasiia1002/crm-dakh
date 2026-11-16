import type { CurrentPriceNight } from '@/types'

export const CURRENT_PRICES_MAX_NIGHTS = 62

export const CURRENT_PRICE_LABEL = {
  test: 'Тестова ціна',
  unpublished: 'Не опубліковано',
  missing: 'Ціну не задано',
} as const

export const CURRENT_PRICE_GUEST_NOW = 'Гості бачать зараз'
export const CURRENT_PRICE_SAVED_LATER = 'Збережено на потім'

export type CurrentPriceNightView = {
  guestAmount: string | null
  guestCaption: string | null
  scheduledAmount: string | null
  scheduledCaption: string | null
  badges: string[]
}

export function currentPriceNightView(night: CurrentPriceNight): CurrentPriceNightView {
  if (night.missing) {
    return {
      guestAmount: null,
      guestCaption: null,
      scheduledAmount: null,
      scheduledCaption: null,
      badges: [CURRENT_PRICE_LABEL.missing],
    }
  }

  const badges: string[] = []
  if (night.guestKind === 'test') {
    badges.push(CURRENT_PRICE_LABEL.test)
  }

  if (night.guestAmount && night.scheduledAmount) {
    badges.push(CURRENT_PRICE_LABEL.unpublished)
    return {
      guestAmount: night.guestAmount,
      guestCaption: CURRENT_PRICE_GUEST_NOW,
      scheduledAmount: night.scheduledAmount,
      scheduledCaption: CURRENT_PRICE_SAVED_LATER,
      badges,
    }
  }

  if (night.scheduledAmount && !night.guestAmount) {
    badges.push(CURRENT_PRICE_LABEL.unpublished)
    return {
      guestAmount: null,
      guestCaption: null,
      scheduledAmount: night.scheduledAmount,
      scheduledCaption: null,
      badges,
    }
  }

  return {
    guestAmount: night.guestAmount,
    guestCaption: night.guestKind === 'test' ? CURRENT_PRICE_LABEL.test : null,
    scheduledAmount: null,
    scheduledCaption: null,
    badges,
  }
}
