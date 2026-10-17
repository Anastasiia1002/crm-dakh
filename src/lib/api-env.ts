/**
 * Validate VITE_API_BASE_URL for the active Vite mode.
 * Production builds must never silently use localhost or an empty URL.
 */

export type ApiEnvMode = 'development' | 'staging' | 'production' | string

export function assertViteApiBaseUrl(raw: string | undefined, mode: ApiEnvMode): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    throw new Error(`VITE_API_BASE_URL is required for Vite mode "${mode}".`)
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute URL (scheme + host).')
  }

  if (url.username || url.password) {
    throw new Error('VITE_API_BASE_URL must not include username or password.')
  }

  if (url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL must not include query or hash.')
  }

  const path = url.pathname.replace(/\/+$/, '')
  if (path && path !== '') {
    throw new Error('VITE_API_BASE_URL must be an origin only (no path such as /api).')
  }

  const host = url.hostname.toLowerCase()
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'

  if (mode === 'production') {
    if (loopback) {
      throw new Error('Production VITE_API_BASE_URL must not point at localhost / 127.0.0.1.')
    }
    if (url.protocol !== 'https:') {
      throw new Error('Production VITE_API_BASE_URL must use https.')
    }
  }

  if (mode === 'staging' && !loopback && url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Staging VITE_API_BASE_URL must use http or https.')
  }

  // Frontend must never embed database / secret material.
  const lowered = value.toLowerCase()
  if (
    lowered.includes('postgres') ||
    lowered.includes('supabase.co/rest') ||
    lowered.includes('service_role') ||
    lowered.includes('jwt_secret')
  ) {
    throw new Error('VITE_API_BASE_URL looks like a database or secret endpoint; use the Nest API origin only.')
  }

  return value.replace(/\/+$/, '')
}

/** True when an origin is clearly loopback (used by deploy checks and docs). */
export function isLoopbackApiOrigin(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
  } catch {
    return false
  }
}
