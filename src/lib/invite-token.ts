const TOKEN_QUERY = 'token'

export function inviteHref(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/invite`
}

/** Read the invite token from the query string, then drop it from the address bar. */
export function consumeInviteTokenFromLocation(options: {
  search?: string
  pathname?: string
  baseUrl?: string
  replaceState?: (url: string, title: string) => void
}): string | null {
  const search = options.search ?? (typeof window === 'undefined' ? '' : window.location.search)
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const token = params.get(TOKEN_QUERY)?.trim() || null
  if (!token) return null
  const pathname = options.pathname ?? (typeof window === 'undefined' ? '/invite' : window.location.pathname)
  const replace =
    options.replaceState ??
    ((url: string, title: string) => {
      if (typeof window.history?.replaceState === 'function') window.history.replaceState(null, title, url)
    })
  replace(pathname, '')
  return token
}

export { TOKEN_QUERY as INVITE_TOKEN_QUERY }
