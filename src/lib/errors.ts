import { ApiError } from '@/lib/api-error'

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      if (error.code === 'INVALID_CREDENTIALS') return 'Неправильний email або пароль.'
      return 'Сесія недійсна. Увійдіть знову.'
    }
    if (error.status === 403) return error.message || 'Недостатньо прав.'
    if (error.status === 404) return error.message || 'Не знайдено.'
    if (error.status === 409) {
      if (error.code === 'INVALID_STATUS_TRANSITION') {
        return 'Неможлива зміна статусу для цього бронювання.'
      }
      if (error.code === 'ROOM_UNAVAILABLE') {
        return 'Номер недоступний на вибрані дати.'
      }
      if (error.code === 'CANCELLATION_NOT_ALLOWED') {
        return 'Скасування недоступне для цього бронювання.'
      }
      const detail = error.details?.[0]
      return detail ? `${error.message}: ${detail}` : error.message || 'Конфлікт даних.'
    }
    if (error.status === 400 && error.details?.length) {
      return `${error.message}: ${error.details.join('; ')}`
    }
    if (error.status >= 500) return 'Сервер тимчасово недоступний. Спробуйте пізніше.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Не вдалося виконати дію'
}
