import type { AdminBookingStatusAction } from '@/types'
import { statusOccupancyImpact } from '@/lib/booking-manage'

export type BookingDetailActionId =
  | 'edit'
  | 'move'
  | 'confirm'
  | 'check-in'
  | 'check-out'
  | 'no-show'
  | 'cancel'

/** Which handler a visible control is allowed to call. */
export function bookingDetailActionTarget(action: BookingDetailActionId) {
  if (action === 'edit' || action === 'move') return 'edit-route' as const
  if (action === 'cancel') return 'cancel-dialog' as const
  return 'status-dialog' as const
}

/**
 * Action-specific confirmation. Each action names the booking and its own
 * consequence; the sentences are not interchangeable.
 */
export function bookingStatusDialog(action: AdminBookingStatusAction, reference: string) {
  const booking = `Бронювання ${reference}`
  if (action === 'confirm') {
    return {
      title: 'Підтвердити бронювання',
      description: `${booking} буде підтверджене. ${statusOccupancyImpact('confirm')}`,
      confirmLabel: 'Підтвердити',
    }
  }
  if (action === 'check-in') {
    return {
      title: 'Заселити гостя',
      description: `${booking} змінить статус заїзду одразу після підтвердження. ${statusOccupancyImpact('check-in')}`,
      confirmLabel: 'Заселити',
    }
  }
  if (action === 'check-out') {
    return {
      title: 'Виселити гостя',
      description: `${booking} буде завершене як виїзд. ${statusOccupancyImpact('check-out')}`,
      confirmLabel: 'Виселити',
    }
  }
  if (action === 'no-show') {
    return {
      title: 'Позначити незаїзд',
      description: `${booking} буде закрите без заселення. ${statusOccupancyImpact('no-show')}`,
      confirmLabel: 'Позначити незаїзд',
    }
  }
  return {
    title: 'Скасувати бронювання',
    description: `${booking}. ${statusOccupancyImpact('cancel')}`,
    confirmLabel: 'Скасувати бронювання',
  }
}
