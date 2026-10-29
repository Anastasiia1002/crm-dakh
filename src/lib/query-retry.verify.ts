/**
 * Query retry policy: recover from network, never retry 401/403.
 * Run: npx --yes tsx src/lib/query-retry.verify.ts
 */
import { ApiError } from './api-error'
import { queryRetryDelay, shouldRetryQuery } from './query-retry'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function main() {
  assert(!shouldRetryQuery(0, new ApiError('x', 401, 'UNAUTHORIZED')), 'no retry 401')
  assert(!shouldRetryQuery(0, new ApiError('x', 401, 'INVALID_SESSION')), 'no retry invalid session')
  assert(!shouldRetryQuery(0, new ApiError('x', 403, 'FORBIDDEN')), 'no retry 403')
  assert(!shouldRetryQuery(0, new ApiError('x', 400, 'VALIDATION')), 'no retry 400')
  assert(!shouldRetryQuery(0, new ApiError('x', 404, 'NOT_FOUND')), 'no retry 404')
  assert(shouldRetryQuery(0, new ApiError('x', 0, 'NETWORK')), 'retry network')
  assert(shouldRetryQuery(1, new ApiError('x', 503)), 'retry 503 once more')
  assert(!shouldRetryQuery(2, new ApiError('x', 503)), 'stop after two retries')
  assert(queryRetryDelay(0) === 1000, 'backoff start')
  assert(queryRetryDelay(3) === 4000, 'backoff cap')
  console.log('PASS: query retry policy')
  console.log('All query retry checks passed.')
}

main()
