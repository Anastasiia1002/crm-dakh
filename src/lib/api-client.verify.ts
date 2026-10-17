/**
 * Focused auth/refresh client checks (no network, no database).
 * Run: npx --yes tsx src/lib/api-client.verify.ts
 */

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

type FetchCall = {
  url: string
  method: string
  authHeader: string | null
  body: unknown
}

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
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    configurable: true,
  })
}

function installViteEnv() {
  const env = {
    VITE_API_BASE_URL: 'http://localhost:3000',
    MODE: 'development',
    DEV: false,
    PROD: false,
    BASE_URL: '/',
  }
  const meta = import.meta as ImportMeta & { env?: Record<string, unknown> }
  try {
    Object.defineProperty(meta, 'env', { value: env, configurable: true, writable: true })
  } catch {
    Object.assign(meta.env ?? {}, env)
  }
  // Ensure reads see DEV even if assign partially failed.
  if (!meta.env || meta.env.DEV === undefined) {
    ;(globalThis as { __vite_env_stub?: typeof env }).__vite_env_stub = env
  }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function withMockFetch(
  handler: (input: string, init?: RequestInit) => Promise<Response> | Response,
  run: (calls: FetchCall[]) => Promise<void>,
) {
  const calls: FetchCall[] = []
  const previous = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const headers = new Headers(init?.headers)
    let body: unknown = undefined
    if (typeof init?.body === 'string' && init.body.length > 0) {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }
    calls.push({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      authHeader: headers.get('Authorization'),
      body,
    })
    return handler(url, init)
  }) as typeof fetch

  try {
    await run(calls)
  } finally {
    globalThis.fetch = previous
  }
}

async function main() {
  installLocalStorage()
  installViteEnv()
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  if (proc?.env) {
    proc.env.VITE_API_BASE_URL = 'http://localhost:3000'
    proc.env.MODE = 'development'
  }

  const {
    apiRequest,
    getAccessTokenForTests,
    refreshAccessToken,
    resetApiClientForTests,
    setAccessToken,
    setSessionLostHandler,
  } = await import('./api-client')
  const { ApiError } = await import('./api-error')
  const { clearAuthStorage, readRefreshToken, writeRefreshToken } = await import('./auth-storage')

  // 1) Expired access token + valid refresh → single refresh, retry succeeds
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-valid')
  setAccessToken('access-expired')
  let lost = 0
  setSessionLostHandler(() => {
    lost += 1
  })

  await withMockFetch(async (url) => {
    if (url.endsWith('/api/admin/bookings')) {
      const auth = getAccessTokenForTests()
      if (auth === 'access-expired') return jsonResponse(401, { error: 'UNAUTHORIZED', message: 'expired' })
      if (auth === 'access-fresh') return jsonResponse(200, { items: [], page: 1 })
      return jsonResponse(500, { message: 'unexpected token' })
    }
    if (url.endsWith('/api/auth/refresh')) {
      return jsonResponse(200, { accessToken: 'access-fresh', refreshToken: 'refresh-rotated' })
    }
    return jsonResponse(404, { message: 'missing stub' })
  }, async (calls) => {
    const data = await apiRequest<{ items: unknown[] }>('/api/admin/bookings')
    assert(Array.isArray(data.items), 'retry returned list')
    assert(getAccessTokenForTests() === 'access-fresh', 'access token rotated in memory')
    assert(readRefreshToken() === 'refresh-rotated', 'refresh token persisted')
    assert(lost === 0, 'session not lost on successful refresh')
    const refreshCalls = calls.filter((c) => c.url.endsWith('/api/auth/refresh'))
    assert(refreshCalls.length === 1, 'exactly one refresh call')
    const refreshBody = refreshCalls[0]?.body as { refreshToken?: string } | undefined
    assert(refreshBody?.refreshToken === 'refresh-valid', 'refresh body')
  })
  console.log('PASS: expired access + valid refresh')

  // 2) Invalid refresh → session cleared, no infinite loop
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-bad')
  setAccessToken('access-expired')
  lost = 0
  setSessionLostHandler(() => {
    lost += 1
  })

  await withMockFetch(async (url) => {
    if (url.endsWith('/api/admin/bookings')) return jsonResponse(401, { error: 'UNAUTHORIZED' })
    if (url.endsWith('/api/auth/refresh')) return jsonResponse(401, { error: 'INVALID_REFRESH' })
    return jsonResponse(404, {})
  }, async (calls) => {
    let thrown: unknown
    try {
      await apiRequest('/api/admin/bookings')
    } catch (error) {
      thrown = error
    }
    assert(thrown instanceof ApiError && thrown.status === 401, 'invalid session error')
    assert(getAccessTokenForTests() === null, 'access cleared')
    assert(readRefreshToken() === null, 'refresh cleared')
    assert(lost === 1, 'session-lost handler fired once')
    assert(calls.filter((c) => c.url.endsWith('/api/auth/refresh')).length === 1, 'no refresh loop')
    assert(calls.filter((c) => c.url.endsWith('/api/admin/bookings')).length === 1, 'no endless retries')
  })
  console.log('PASS: invalid refresh clears session')

  // 3) Logout-equivalent local clear
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-keep')
  setAccessToken('access-keep')
  clearAuthStorage()
  setAccessToken(null)
  assert(readRefreshToken() === null, 'logout clears refresh storage')
  assert(getAccessTokenForTests() === null, 'logout clears access memory')
  console.log('PASS: logout clears auth state')

  // 4) Concurrent 401s share one refresh
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-shared')
  setAccessToken('access-expired')
  let refreshCount = 0

  await withMockFetch(async (url) => {
    if (url.endsWith('/api/protected')) {
      if (getAccessTokenForTests() === 'access-expired') return jsonResponse(401, { error: 'UNAUTHORIZED' })
      return jsonResponse(200, { ok: true })
    }
    if (url.endsWith('/api/auth/refresh')) {
      refreshCount += 1
      await new Promise((r) => setTimeout(r, 20))
      return jsonResponse(200, { accessToken: 'access-shared', refreshToken: 'refresh-shared-2' })
    }
    return jsonResponse(404, {})
  }, async () => {
    const [a, b, c] = await Promise.all([
      apiRequest<{ ok: boolean }>('/api/protected'),
      apiRequest<{ ok: boolean }>('/api/protected'),
      apiRequest<{ ok: boolean }>('/api/protected'),
    ])
    assert(a.ok && b.ok && c.ok, 'all concurrent requests succeed after refresh')
    assert(refreshCount === 1, 'single shared refresh for concurrent 401s')
    assert(getAccessTokenForTests() === 'access-shared', 'shared access token applied')
  })
  console.log('PASS: concurrent 401 share one refresh')

  // 5) refreshAccessToken failure returns false and clears storage
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-dead')
  lost = 0
  setSessionLostHandler(() => {
    lost += 1
  })
  await withMockFetch(async (url) => {
    if (url.endsWith('/api/auth/refresh')) return jsonResponse(401, { error: 'INVALID_REFRESH' })
    return jsonResponse(404, {})
  }, async () => {
    const ok = await refreshAccessToken()
    assert(ok === false, 'refreshAccessToken false')
    assert(readRefreshToken() === null, 'refresh removed')
    assert(lost === 1, 'session lost on direct refresh failure')
  })
  console.log('PASS: refreshAccessToken failure')

  // 6) Successful refreshAccessToken with no prior access token (restore path)
  resetApiClientForTests()
  clearAuthStorage()
  writeRefreshToken('refresh-restore')
  await withMockFetch(async (url) => {
    if (url.endsWith('/api/auth/refresh')) {
      return jsonResponse(200, { accessToken: 'access-restored', refreshToken: 'refresh-restored' })
    }
    return jsonResponse(404, {})
  }, async () => {
    const ok = await refreshAccessToken()
    assert(ok === true, 'restore refresh ok')
    assert(getAccessTokenForTests() === 'access-restored', 'access restored')
    assert(readRefreshToken() === 'refresh-restored', 'refresh restored')
  })
  console.log('PASS: restore-session refresh')

  console.log('All api-client auth/refresh checks passed.')
}

main().catch((error) => {
  console.error(error)
  const proc = (globalThis as { process?: { exit?: (code: number) => void } }).process
  proc?.exit?.(1)
})
