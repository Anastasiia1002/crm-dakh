import { apiRequest, refreshAccessToken, setAccessToken, setSessionLostHandler } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import { clearAuthStorage, readRefreshToken, writeRefreshToken } from '@/lib/auth-storage'
import { queryClient } from '@/lib/queryClient'
import { mapBackendRole } from '@/lib/roles'
import type { AdminUser } from '@/types'

type AuthTokenResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  admin: BackendAdmin
}

type BackendAdmin = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  active: boolean
}

setSessionLostHandler(() => {
  queryClient.setQueryData(['session'], null)
})

export async function login(email: string, password: string): Promise<AdminUser> {
  try {
    const session = await apiRequest<AuthTokenResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
      retry: false,
    })
    const user = toAdminUser(session.admin)
    persistSession(session)
    return user
  } catch (error) {
    throw toLoginError(error)
  }
}

export async function restoreSession(): Promise<AdminUser | null> {
  if (!readRefreshToken()) return null
  try {
    const refreshed = await refreshAccessToken()
    if (!refreshed) return null
    return await getCurrentUser()
  } catch {
    clearLocalSession()
    return null
  }
}

export async function getCurrentUser(): Promise<AdminUser> {
  const profile = await apiRequest<BackendAdmin>('/api/auth/me')
  return toAdminUser(profile)
}

export async function logout() {
  const refreshToken = readRefreshToken()
  try {
    if (refreshToken) {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
        retry: false,
      })
    }
  } catch {
    // An expired session must still end locally.
  } finally {
    clearLocalSession()
  }
}

function persistSession(session: AuthTokenResponse) {
  if (!session.accessToken || !session.refreshToken) {
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'INVALID_SESSION')
  }
  clearAuthStorage()
  setAccessToken(session.accessToken)
  writeRefreshToken(session.refreshToken)
}

function clearLocalSession() {
  setAccessToken(null)
  clearAuthStorage()
  queryClient.setQueryData(['session'], null)
}

function toAdminUser(admin: BackendAdmin): AdminUser {
  if (
    !admin ||
    typeof admin.id !== 'string' ||
    typeof admin.email !== 'string' ||
    typeof admin.firstName !== 'string' ||
    typeof admin.lastName !== 'string' ||
    typeof admin.role !== 'string' ||
    typeof admin.active !== 'boolean'
  ) {
    throw new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'INVALID_PROFILE')
  }
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    role: mapBackendRole(admin.role),
    active: admin.active,
  }
}

function toLoginError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', 0, 'NETWORK')
  }
  if (error.status === 401) return new ApiError('Невірна електронна пошта або пароль', 401, error.code)
  if (error.status === 429) return new ApiError('Забагато спроб. Спробуйте пізніше.', 429, error.code)
  if (error.status === 400) return new ApiError('Перевірте електронну пошту та пароль', 400, error.code)
  if (error.status === 0 || error.status >= 500) {
    return new ApiError('Сервер тимчасово недоступний. Спробуйте пізніше.', error.status, error.code)
  }
  return new ApiError('Не вдалося увійти', error.status, error.code)
}
