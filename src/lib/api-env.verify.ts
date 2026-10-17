/**
 * Run: npx --yes tsx src/lib/api-env.verify.ts
 */
import { assertViteApiBaseUrl, isLoopbackApiOrigin } from './api-env'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function throws(fn: () => void, re: RegExp) {
  try {
    fn()
  } catch (error) {
    assert(re.test(String(error instanceof Error ? error.message : error)), `expected ${re}`)
    return
  }
  throw new Error(`expected throw matching ${re}`)
}

throws(() => assertViteApiBaseUrl(undefined, 'production'), /required/)
throws(() => assertViteApiBaseUrl('', 'staging'), /required/)
throws(() => assertViteApiBaseUrl('not-a-url', 'development'), /absolute URL/)
throws(() => assertViteApiBaseUrl('http://user:pass@localhost:3000', 'development'), /username or password/)
throws(() => assertViteApiBaseUrl('http://localhost:3000/api', 'development'), /origin only/)
throws(() => assertViteApiBaseUrl('http://localhost:3000', 'production'), /must not point at localhost/)
throws(() => assertViteApiBaseUrl('http://api.example.com', 'production'), /must use https/)
throws(() => assertViteApiBaseUrl('postgres://db.example.com', 'production'), /https|secret|database|postgres/)
assert(
  assertViteApiBaseUrl('http://localhost:3000', 'development') === 'http://localhost:3000',
  'development localhost allowed',
)
assert(
  assertViteApiBaseUrl('http://localhost:3000/', 'staging') === 'http://localhost:3000',
  'staging localhost allowed and trimmed',
)
assert(
  assertViteApiBaseUrl('https://api.example.com', 'production') === 'https://api.example.com',
  'production https allowed',
)
assert(isLoopbackApiOrigin('http://127.0.0.1:3000'), 'loopback detect')
assert(!isLoopbackApiOrigin('https://api.example.com'), 'non-loopback')

console.log('All api-env checks passed.')
