import { ApiError } from '@/lib/api-error'
import { clearAuthStorage, readRefreshToken, writeRefreshToken } from '@/lib/auth-storage'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

type ApiRequestOptions = {
  method?: Method
  body?: unknown
  auth?: boolean
  retry?: boolean
  signal?: AbortSignal
}

type TokenResponse = {
  accessToken: string
  refreshToken: string
}

let accessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null
let onSessionLost: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setSessionLostHandler(handler: () => void) {
  onSessionLost = handler
}

export function apiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (typeof configured !== 'string' || configured.trim().length === 0) {
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'API_URL_MISSING')
  }
  return configured.trim().replace(/\/+$/, '')
}

export async function refreshAccessToken(): Promise<boolean> {
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

  let response: Response
  try {
    response = await fetch(resolveUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error
    }
    if (import.meta.env.DEV) console.error('API network error', path)
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'NETWORK')
  }

  if (response.status === 401 && options.auth !== false && options.retry !== false) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) throw new ApiError('Сесія недійсна', 401, 'INVALID_SESSION')
    return apiRequest<T>(path, { ...options, retry: false })
  }

  if (!response.ok) throw await readError(response)
  return readSuccess<T>(response)
}

function resolveUrl(path: string) {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl()}${suffix}`
}

async function rotateSession(): Promise<boolean> {
  const refreshToken = readRefreshToken()
  if (!refreshToken) {
    dropSession()
    return false
  }

  try {
    const session = await apiRequest<TokenResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      retry: false,
    })
    if (!session.accessToken || !session.refreshToken) {
      dropSession()
      return false
    }
    accessToken = session.accessToken
    writeRefreshToken(session.refreshToken)
    return true
  } catch (error) {
    if (import.meta.env.DEV && error instanceof ApiError) {
      console.error('Session refresh failed', error.status, error.code ?? '')
    }
    dropSession()
    return false
  }
}

function dropSession() {
  accessToken = null
  clearAuthStorage()
  onSessionLost?.()
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
