import { loginHref, rememberReturnPath, sanitizeReturnPath } from '@/lib/session-policy'

function isLoginPath(pathname: string, baseUrl: string): boolean {
  const base = baseUrl.replace(/\/+$/, '') || ''
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === `${base}/login` || path === '/login'
}

/** Full-page login navigation. Tokens never go in the URL. */
export function redirectToLogin(options?: { from?: string; baseUrl?: string; replace?: typeof location.replace }) {
  if (typeof window === 'undefined') return
  const baseUrl = options?.baseUrl ?? import.meta.env?.BASE_URL ?? '/'
  const pathname = window.location?.pathname ?? ''
  if (pathname && isLoginPath(pathname, baseUrl)) return
  const from = options?.from ?? (pathname ? `${pathname}${window.location?.search ?? ''}` : '/admin')
  rememberReturnPath(sanitizeReturnPath(from), window.sessionStorage)
  const replace =
    options?.replace ??
    ((url: string) => {
      if (typeof window.location?.replace === 'function') window.location.replace(url)
    })
  replace(loginHref(baseUrl))
}
