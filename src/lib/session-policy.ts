import { ApiError } from '@/lib/api-error'

export const REQUEST_TIMEOUT_MS = 45_000
export const SLOW_AUTH_MS = 4_000
export const AUTH_RETURN_STORAGE_KEY = 'dakh.auth.return'

/** Confirmed auth failures that must log the user out. */
export function isInvalidSessionError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.code === 'INVALID_SESSION') return true
  if (error.status !== 401) return false
  if (error.code === 'INVALID_CREDENTIALS') return false
  return error.code === 'UNAUTHORIZED' || error.code === 'INVALID_REFRESH' || error.code === undefined
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

/** Timeout, DNS, Render cold-start, and 5xx — keep the session. */
export function isRecoverableConnectionError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return error instanceof TypeError
  if (error.code === 'NETWORK' || error.code === 'TIMEOUT' || error.code === 'API_URL_MISSING') return true
  if (error.status === 0) return true
  if (error.status === 429) return true
  return error.status >= 500
}

export function shouldLogoutOnAuthFailure(error: unknown): boolean {
  if (isForbiddenError(error)) return false
  if (isRecoverableConnectionError(error)) return false
  return isInvalidSessionError(error)
}

/** Same-app admin paths only. Never protocol-relative or absolute URLs. */
export function sanitizeReturnPath(value: string | null | undefined): string {
  if (!value) return '/admin'
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/admin'
  if (trimmed.includes('\\') || trimmed.includes('://')) return '/admin'
  if (trimmed.startsWith('/login')) return '/admin'
  if (!trimmed.startsWith('/admin')) return '/admin'
  return trimmed.length > 512 ? '/admin' : trimmed
}

export function loginHref(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/login`
}

export function rememberReturnPath(path: string, storage?: Pick<Storage, 'setItem'> | null) {
  try {
    storage?.setItem(AUTH_RETURN_STORAGE_KEY, sanitizeReturnPath(path))
  } catch {
    // Private mode can refuse sessionStorage.
  }
}

export function consumeReturnPath(storage?: Pick<Storage, 'getItem' | 'removeItem'> | null): string {
  try {
    const value = storage?.getItem(AUTH_RETURN_STORAGE_KEY) ?? null
    storage?.removeItem(AUTH_RETURN_STORAGE_KEY)
    return sanitizeReturnPath(value)
  } catch {
    return '/admin'
  }
}

export type RefreshOutcome = 'ok' | 'invalid' | 'unavailable'

export function refreshOutcomeFromError(error: unknown): Exclude<RefreshOutcome, 'ok'> {
  if (shouldLogoutOnAuthFailure(error)) return 'invalid'
  return 'unavailable'
}
