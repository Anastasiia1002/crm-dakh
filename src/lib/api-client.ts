import { ApiError } from '@/lib/api-error'
import { assertViteApiBaseUrl } from '@/lib/api-env'
import { redirectToLogin } from '@/lib/auth-redirect'
import { clearAuthStorage, readRefreshToken, REFRESH_TOKEN_KEY, writeRefreshToken } from '@/lib/auth-storage'
import { REQUEST_TIMEOUT_MS, refreshOutcomeFromError, type RefreshOutcome } from '@/lib/session-policy'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

type ApiRequestOptions = {
  method?: Method
  body?: unknown
  auth?: boolean
  retry?: boolean
  signal?: AbortSignal
  timeoutMs?: number
}

type TokenResponse = {
  accessToken: string
  refreshToken: string
}

let accessToken: string | null = null
let refreshInFlight: Promise<RefreshOutcome> | null = null
let onSessionLost: (() => void) | null = null
let storageListenerInstalled = false

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setSessionLostHandler(handler: () => void) {
  onSessionLost = handler
}

/** Test-only: inspect in-memory access token. */
export function getAccessTokenForTests() {
  return accessToken
}

/** Test-only: reset module session state between verify cases. */
export function resetApiClientForTests() {
  accessToken = null
  refreshInFlight = null
  onSessionLost = null
}

function processEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return proc?.env?.[name]
}

export function apiBaseUrl() {
  try {
    const fromImport = import.meta.env?.VITE_API_BASE_URL
    const fromProcess = processEnv('VITE_API_BASE_URL')
    const mode = import.meta.env?.MODE ?? processEnv('MODE') ?? 'development'
    return assertViteApiBaseUrl(fromImport ?? fromProcess, mode)
  } catch {
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'API_URL_MISSING')
  }
}

export async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = rotateSession().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const timed = timeoutSignal(options.signal, options.timeoutMs ?? REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(resolveUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: timed.signal,
    })
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError' && options.signal?.aborted)) {
      throw error
    }
    if (isTimeoutError(error) || timed.timedOut) {
      throw new ApiError('Сервер відповідає занадто довго. Спробуйте ще раз.', 0, 'TIMEOUT')
    }
    if (import.meta.env?.DEV) console.error('API network error', path)
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'NETWORK')
  } finally {
    timed.clear()
  }

  if (response.status === 401 && options.auth !== false) {
    if (options.retry !== false) {
      const refreshed = await refreshAccessToken()
      if (refreshed === 'ok') return apiRequest<T>(path, { ...options, retry: false })
      if (refreshed === 'unavailable') {
        throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'NETWORK')
      }
      throw new ApiError('Сесія недійсна', 401, 'INVALID_SESSION')
    }
    dropSession('invalid')
    throw new ApiError('Сесія недійсна', 401, 'INVALID_SESSION')
  }

  if (!response.ok) throw await readError(response)
  return readSuccess<T>(response)
}

function resolveUrl(path: string) {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl()}${suffix}`
}

async function rotateSession(): Promise<RefreshOutcome> {
  const refreshToken = readRefreshToken()
  if (!refreshToken) {
    dropSession('invalid')
    return 'invalid'
  }

  try {
    const session = await apiRequest<TokenResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      retry: false,
    })
    if (!session.accessToken || !session.refreshToken) {
      dropSession('invalid')
      return 'invalid'
    }
    accessToken = session.accessToken
    writeRefreshToken(session.refreshToken)
    return 'ok'
  } catch (error) {
    if (import.meta.env?.DEV && error instanceof ApiError) {
      console.error('Session refresh failed', error.status, error.code ?? '')
    }
    const outcome = refreshOutcomeFromError(error)
    if (outcome === 'invalid') dropSession('invalid')
    return outcome
  }
}

function dropSession(reason: 'invalid' | 'local') {
  accessToken = null
  clearAuthStorage()
  onSessionLost?.()
  if (reason === 'invalid' && typeof window !== 'undefined') {
    redirectToLogin()
  }
}

function timeoutSignal(userSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('Timeout', 'TimeoutError'))
  }, timeoutMs)
  const onUserAbort = () => controller.abort(userSignal?.reason)
  userSignal?.addEventListener('abort', onUserAbort, { once: true })
  if (userSignal?.aborted) onUserAbort()
  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut
    },
    clear() {
      clearTimeout(timer)
      userSignal?.removeEventListener('abort', onUserAbort)
    },
  }
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof DOMException)) return false
  return error.name === 'TimeoutError' || error.message === 'Timeout'
}

async function readSuccess<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', response.status, 'INVALID_RESPONSE')
  }
}

async function readError(response: Response): Promise<ApiError> {
  let code: string | undefined
  let details: string[] | undefined
  let message = 'Не вдалося виконати запит'
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const record = body as { error?: unknown; message?: unknown; details?: unknown }
      if (typeof record.error === 'string') code = record.error
      const safe = safeMessage(record.message)
      if (safe) message = safe
      details = safeDetails(record.details)
    }
  } catch {
    // Non-JSON error bodies stay on the generic message.
  }

  if (response.status === 429) return new ApiError('Забагато спроб. Спробуйте пізніше.', 429, code)
  if (response.status >= 500) {
    return new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', response.status, code)
  }
  return new ApiError(message, response.status, code, details)
}

function safeMessage(value: unknown) {
  if (typeof value !== 'string') return null
  const message = value.trim()
  if (!message || message.length > 240) return null
  if (/prisma|passwordhash|tokenhash|stack trace|at \/|exception/i.test(message)) return null
  return message
}

function safeDetails(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const details = value.flatMap((item) => {
    const message = safeMessage(item)
    return message ? [message] : []
  })
  return details.length > 0 ? details : undefined
}

export function installAuthStorageListener() {
  if (storageListenerInstalled || typeof window === 'undefined') return
  if (typeof window.addEventListener !== 'function') return
  storageListenerInstalled = true
  window.addEventListener('storage', (event) => {
    if (event.key !== REFRESH_TOKEN_KEY) return
    if (event.newValue === null && event.oldValue) {
      accessToken = null
      onSessionLost?.()
      redirectToLogin()
    }
  })
}
