import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { claimStaleChunkReload, clearStaleChunkReload, isChunkLoadError } from './chunk-load.ts'

const message = 'Failed to fetch dynamically imported module: https://crm-dakh-silk.vercel.app/assets/BookingDetailPage-old.js'

assert.equal(isChunkLoadError(new TypeError(message)), true)
assert.equal(isChunkLoadError({ payload: new TypeError(message) }), true)
assert.equal(isChunkLoadError(new Error('Недостатньо прав.')), false)

const storage = new Map<string, string>()
const store = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
}
const path = '/admin/bookings/11111111-1111-4111-8111-111111111111'
assert.equal(claimStaleChunkReload(new TypeError(message), path, store), true)
assert.equal(claimStaleChunkReload(new TypeError(message), path, store), false)
assert.equal(claimStaleChunkReload(new TypeError(message), '/admin/bookings', store), true)
clearStaleChunkReload(store)
assert.equal(claimStaleChunkReload(new TypeError(message), path, store), true)
assert.equal(claimStaleChunkReload(new Error('booking failed'), path, store), false)

const page = readFileSync(new URL('../components/RouteErrorPage.tsx', import.meta.url), 'utf8')
const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert.match(page, /Сторінку не вдалося відкрити/)
assert.match(page, /До списку бронювань/)
assert.equal(page.includes('Unexpected Application Error'), false)
assert.match(router, /errorElement: <RouteErrorPage \/>/)
assert.match(router, /bookings\/:id/)

console.log('chunk reload verified')
