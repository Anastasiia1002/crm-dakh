/**
 * Session classification, return-path sanitization, and connection vs JWT.
 * Run: npx --yes tsx src/lib/session-policy.verify.ts
 */
import { ApiError } from './api-error'
import {
  consumeReturnPath,
  isForbiddenError,
  isInvalidSessionError,
  isRecoverableConnectionError,
  loginHref,
  rememberReturnPath,
  sanitizeReturnPath,
  shouldLogoutOnAuthFailure,
  AUTH_RETURN_STORAGE_KEY,
} from './session-policy'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const storage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

function main() {
  assert(isInvalidSessionError(new ApiError('x', 401, 'INVALID_SESSION')), 'invalid session')
  assert(isInvalidSessionError(new ApiError('x', 401, 'UNAUTHORIZED')), 'unauthorized after retry')
  assert(!isInvalidSessionError(new ApiError('x', 401, 'INVALID_CREDENTIALS')), 'login credentials are not a lost session')
  assert(isForbiddenError(new ApiError('x', 403, 'FORBIDDEN')), '403')
  assert(!shouldLogoutOnAuthFailure(new ApiError('x', 403, 'FORBIDDEN')), '403 does not logout')
  assert(isRecoverableConnectionError(new ApiError('x', 0, 'NETWORK')), 'network')
  assert(isRecoverableConnectionError(new ApiError('x', 0, 'TIMEOUT')), 'timeout')
  assert(isRecoverableConnectionError(new ApiError('x', 503, 'UPSTREAM')), '503')
  assert(!shouldLogoutOnAuthFailure(new ApiError('x', 0, 'TIMEOUT')), 'timeout keeps session')
  assert(!shouldLogoutOnAuthFailure(new ApiError('x', 503)), '5xx keeps session')
  assert(shouldLogoutOnAuthFailure(new ApiError('x', 401, 'INVALID_SESSION')), 'confirmed invalid logs out')
  console.log('PASS: session error classification')

  assert(sanitizeReturnPath('/admin/bookings') === '/admin/bookings', 'admin path kept')
  assert(sanitizeReturnPath('https://evil.test') === '/admin', 'absolute url refused')
  assert(sanitizeReturnPath('//evil.test') === '/admin', 'protocol-relative refused')
  assert(sanitizeReturnPath('/login') === '/admin', 'login is not a return path')
  assert(sanitizeReturnPath('/auth') === '/admin', 'non-admin refused')
  assert(loginHref('/crm-dakh/') === '/crm-dakh/login', 'basename login')
  const store = storage()
  rememberReturnPath('/admin/bookings/new', store)
  assert(store.getItem(AUTH_RETURN_STORAGE_KEY) === '/admin/bookings/new', 'return stored')
  assert(consumeReturnPath(store) === '/admin/bookings/new', 'return consumed')
  assert(store.getItem(AUTH_RETURN_STORAGE_KEY) === null, 'return cleared')
  console.log('PASS: safe return path')
  console.log('All session policy checks passed.')
}

main()
