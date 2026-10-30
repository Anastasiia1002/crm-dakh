import { ApiError } from '@/lib/api-error'
import { isRecoverableConnectionError } from '@/lib/session-policy'

export type MutationKind = 'create' | 'update' | 'cancel' | 'status'

export type MutationPhase = 'idle' | 'validating' | 'submitting' | 'success' | 'error' | 'uncertain'

export function createValidatingCopy() {
  return {
    title: 'Перевіряємо дані',
    detail: 'Перевіряємо форму, доступність і розрахунок. Бронювання ще не надіслане на сервер.',
  }
}

export function createProgressCopy() {
  return {
    title: 'Надсилаємо бронювання',
    detail: 'Запит уже на сервері. Успіх з’явиться лише після підтвердженої відповіді. Не натискайте повторно.',
  }
}

export function createUncertainCopy() {
  return {
    title: 'Перевіряємо результат бронювання',
    detail:
      'Сервер ще не підтвердив результат. Бронювання могло бути створене. Не надсилайте його повторно, доки результат не буде перевірено.',
  }
}

export function mutationOverlayCopy(kind: MutationKind, phase?: Extract<MutationPhase, 'validating' | 'submitting'>): { title: string; detail: string } {
  if (kind === 'create' && phase === 'validating') return createValidatingCopy()
  if (kind === 'create') return createProgressCopy()
  if (kind === 'update') {
    return {
      title: 'Зберігаємо зміни…',
      detail: 'Зачекайте, поки система підтвердить результат.',
    }
  }
  if (kind === 'cancel') {
    return {
      title: 'Скасовуємо бронювання…',
      detail: 'Зачекайте, поки система підтвердить результат.',
    }
  }
  return {
    title: 'Оновлюємо статус…',
    detail: 'Зачекайте, поки система підтвердить результат.',
  }
}

/**
 * Aborting fetch does not cancel the server write.
 * Timeouts and 5xx after a write starts are uncertain, not failed.
 */
export function classifyMutationFailure(kind: MutationKind, error: unknown): Extract<MutationPhase, 'error' | 'uncertain'> {
  if (error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 409 || error.status === 403)) {
    return 'error'
  }
  if (error instanceof ApiError && error.status === 401) return 'error'
  if (kind === 'create' || kind === 'update' || kind === 'cancel' || kind === 'status') {
    if (isRecoverableConnectionError(error)) return 'uncertain'
  }
  return 'error'
}

export function uncertainOutcomeMessage() {
  return 'Не вдалося підтвердити результат операції. Запит на сервері міг завершитися. Не надсилайте форму повторно, доки не перевірите список бронювань.'
}

export function abortDoesNotCancelServerMessage() {
  return 'Зупинка очікування не скасовує операцію на сервері.'
}
