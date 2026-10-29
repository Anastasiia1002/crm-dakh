/**
 * Full-page login redirect stays on-app and never puts tokens in the URL.
 * Run: npx --yes tsx src/lib/auth-redirect.verify.ts
 */
import { redirectToLogin } from './auth-redirect'
import { AUTH_RETURN_STORAGE_KEY } from './session-policy'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function main() {
  const map = new Map<string, string>()
  const sessionStorage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
  let replaced: string | null = null
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { pathname: '/admin/bookings', search: '', replace() {} },
      sessionStorage,
    },
  })

  redirectToLogin({
    from: '/admin/bookings?id=1',
    baseUrl: '/',
    replace: (url) => {
      replaced = url
    },
  })
  assert(replaced === '/login', 'hard redirect to login')
  assert(map.get(AUTH_RETURN_STORAGE_KEY) === '/admin/bookings?id=1', 'return path stored')
  assert(!String(replaced).includes('token'), 'no token in url')

  replaced = null
  redirectToLogin({
    from: 'https://evil.test/steal',
    baseUrl: '/crm-dakh/',
    replace: (url) => {
      replaced = url
    },
  })
  assert(replaced === '/crm-dakh/login', 'basename applied')
  assert(map.get(AUTH_RETURN_STORAGE_KEY) === '/admin', 'unsafe return discarded')
  console.log('PASS: login redirect')
  console.log('All auth redirect checks passed.')
}

main()
