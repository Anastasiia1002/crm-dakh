const REFRESH_TOKEN_KEY = 'dakh.auth.refresh'
const LEGACY_MOCK_USER_KEY = 'dakh.admin.user'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readRefreshToken(): string | null {
  const value = storage()?.getItem(REFRESH_TOKEN_KEY)
  return value && value.length > 0 ? value : null
}

export function writeRefreshToken(token: string | null) {
  const store = storage()
  if (!store) return
  if (token) store.setItem(REFRESH_TOKEN_KEY, token)
  else store.removeItem(REFRESH_TOKEN_KEY)
}

export function clearAuthStorage() {
  writeRefreshToken(null)
  storage()?.removeItem(LEGACY_MOCK_USER_KEY)
}
