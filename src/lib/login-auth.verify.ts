/**
 * Login success, rejected credentials, expired session copy, and network errors.
 * Run: npx --yes tsx src/lib/login-auth.verify.ts
 */
import { ApiError } from './api-error'
import { errorMessage } from './errors'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const CREDENTIALS = 'Неправильний email або пароль.'
const SESSION = 'Сесія недійсна. Увійдіть знову.'
const OFFLINE = 'Сервер тимчасово недоступний. Спробуйте пізніше.'

function installLocalStorage() {
  const map = new Map<string, string>()
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => map.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  Object.defineProperty(globalThis, 'window', { value: { localStorage: storage }, configurable: true })
}

function installEnv() {
  const meta = import.meta as ImportMeta & { env?: Record<string, unknown> }
  const env = {
    VITE_API_BASE_URL: 'http://localhost:3000',
    MODE: 'development',
    DEV: false,
    PROD: false,
    BASE_URL: '/',
  }
  try {
    Object.defineProperty(meta, 'env', { value: env, configurable: true, writable: true })
  } catch {
    Object.assign(meta.env ?? {}, env)
  }
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  if (proc?.env) {
    proc.env.VITE_API_BASE_URL = 'http://localhost:3000'
    proc.env.MODE = 'development'
  }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function main() {
  assert(errorMessage(new ApiError('Невірний email або пароль', 401, 'INVALID_CREDENTIALS')) === CREDENTIALS, 'credentials copy')
  assert(errorMessage(new ApiError('Сесія недійсна', 401, 'INVALID_SESSION')) === SESSION, 'expired session copy')
  assert(errorMessage(new ApiError('Потрібна автентифікація', 401, 'UNAUTHORIZED')) === SESSION, 'missing session copy')
  assert(errorMessage(new ApiError(OFFLINE, 0, 'NETWORK')) === OFFLINE, 'network copy')
  assert(errorMessage(new ApiError(OFFLINE, 503, 'UPSTREAM')) === OFFLINE, 'server copy')
  assert(
    errorMessage(new ApiError('Сервер відповідає занадто довго. Спробуйте ще раз.', 0, 'TIMEOUT')) ===
      'Сервер відповідає занадто довго. Спробуйте ще раз.',
    'timeout copy is not an expired session',
  )
  console.log('PASS: login error copy')

  installLocalStorage()
  installEnv()

  const { login } = await import('../api/auth')
  const { getAccessTokenForTests, resetApiClientForTests } = await import('./api-client')
  const { clearAuthStorage, readRefreshToken, writeRefreshToken } = await import('./auth-storage')

  const staff = {
    id: 'admin-1',
    email: 'staff@dakh.test',
    firstName: 'Staff',
    lastName: 'User',
    role: 'ADMIN',
    active: true,
  }

  resetApiClientForTests()
  clearAuthStorage()
  const previous = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { email?: string; password?: string }
    assert(body.email === 'staff@dakh.test', 'login email sent')
    assert(typeof body.password === 'string' && body.password.length > 0, 'login password sent')
    return jsonResponse(200, {
      accessToken: 'access-ok',
      refreshToken: 'refresh-ok',
      expiresIn: 900,
      admin: staff,
    })
  }
  try {
    const user = await login('staff@dakh.test', 'correct-password')
    assert(user.email === 'staff@dakh.test', 'login returns staff email')
    assert(user.role === 'admin', 'backend ADMIN maps to admin')
    assert(user.active === true, 'active staff')
    assert(getAccessTokenForTests() === 'access-ok', 'access token kept in memory')
    assert(readRefreshToken() === 'refresh-ok', 'refresh token stored')
  } finally {
    globalThis.fetch = previous
  }
  console.log('PASS: login success')

  resetApiClientForTests()
  clearAuthStorage()
  globalThis.fetch = async () =>
    jsonResponse(401, {
      statusCode: 401,
      error: 'INVALID_CREDENTIALS',
      message: 'Невірний email або пароль',
    })
  try {
    let thrown: unknown
    try {
      await login('staff@dakh.test', 'wrong-password')
    } catch (error) {
      thrown = error
    }
    assert(thrown instanceof ApiError, 'rejected login throws ApiError')
    assert(thrown instanceof ApiError && thrown.status === 401, 'rejected login status')
    assert(thrown instanceof ApiError && thrown.code === 'INVALID_CREDENTIALS', 'rejected login code')
    assert(errorMessage(thrown) === CREDENTIALS, 'rejected login is not an expired session')
    assert(getAccessTokenForTests() === null, 'rejected login stores no access token')
    assert(readRefreshToken() === null, 'rejected login stores no refresh token')
  } finally {
    globalThis.fetch = previous
  }
  console.log('PASS: invalid credentials')

  resetApiClientForTests()
  clearAuthStorage()
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  try {
    let thrown: unknown
    try {
      await login('staff@dakh.test', 'any-password')
    } catch (error) {
      thrown = error
    }
    assert(thrown instanceof ApiError && thrown.code === 'NETWORK', 'network code')
    assert(errorMessage(thrown) === OFFLINE, 'network is not an expired session')
    assert(getAccessTokenForTests() === null, 'network login stores no access token')
  } finally {
    globalThis.fetch = previous
  }
  console.log('PASS: login network error')

  const { restoreSession } = await import('../api/auth')
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-restore')
  let meCalls = 0
  let refreshCalls = 0
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.endsWith('/api/auth/refresh')) {
      refreshCalls += 1
      return jsonResponse(200, {
        accessToken: 'access-restored',
        refreshToken: 'refresh-restored',
        expiresIn: 900,
        admin: staff,
      })
    }
    if (url.endsWith('/api/auth/me')) {
      meCalls += 1
      return jsonResponse(200, staff)
    }
    return jsonResponse(404, {})
  }
  try {
    const [first, second] = await Promise.all([restoreSession(), restoreSession()])
    assert(first?.email === 'staff@dakh.test' && second?.email === 'staff@dakh.test', 'restore returns user')
    assert(refreshCalls === 1, 'restore shares one refresh')
    assert(meCalls === 2, 'profile fetched after restore')
    assert(getAccessTokenForTests() === 'access-restored', 'access restored for queries')
  } finally {
    globalThis.fetch = previous
  }
  console.log('PASS: restore session once')

  console.log('All login auth checks passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'login auth checks failed')
  const proc = (globalThis as { process?: { exit?: (code: number) => void } }).process
  proc?.exit?.(1)
})
