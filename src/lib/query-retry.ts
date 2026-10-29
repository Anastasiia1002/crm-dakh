import { ApiError } from '@/lib/api-error'
import { isForbiddenError, isInvalidSessionError, isRecoverableConnectionError } from '@/lib/session-policy'

const MAX_RECOVERABLE_RETRIES = 2

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RECOVERABLE_RETRIES) return false
  if (isInvalidSessionError(error) || isForbiddenError(error)) return false
  if (error instanceof ApiError && error.status === 400) return false
  if (error instanceof ApiError && error.status === 404) return false
  if (error instanceof ApiError && error.status === 409) return false
  return isRecoverableConnectionError(error)
}

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(1_000 * 2 ** attemptIndex, 4_000)
}
