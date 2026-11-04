import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  claimStaleChunkReload,
  clearStaleChunkReload,
  hasUnsavedWork,
  isChunkLoadError,
  noteRecoveredBuild,
  setUnsavedWork,
} from './chunk-load.ts'

const message = 'Failed to fetch dynamically imported module: https://crm-dakh-silk.vercel.app/assets/DashboardPage-old.js'
const build = '/assets/index-old.js'
const nextBuild = '/assets/index-new.js'

assert.equal(isChunkLoadError(new TypeError(message)), true)
assert.equal(isChunkLoadError({ payload: new TypeError(message) }), true)
assert.equal(isChunkLoadError(new TypeError('Unable to preload CSS for /assets/index-old.css')), true)
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

assert.equal(claimStaleChunkReload(new TypeError(message), build, store), true)
assert.equal(claimStaleChunkReload(new TypeError(message), build, store), false, 'the same shell does not reload again')
noteRecoveredBuild(build, store)
assert.equal(claimStaleChunkReload(new TypeError(message), build, store), false, 'a failed recovery stays on the screen')
noteRecoveredBuild(nextBuild, store)
assert.equal(store.getItem('dakh-chunk-reload'), null, 'a new deployment may recover once')
assert.equal(claimStaleChunkReload(new TypeError(message), nextBuild, store), true)
setUnsavedWork(true)
assert.equal(hasUnsavedWork(), true)
assert.equal(claimStaleChunkReload(new TypeError(message), '/assets/index-third.js', store, { unsaved: true }), false)
setUnsavedWork(false)
clearStaleChunkReload(store)
assert.equal(claimStaleChunkReload(new TypeError(message), build, store), true)
assert.equal(claimStaleChunkReload(new Error('booking failed'), build, store), false)

const page = readFileSync(new URL('../components/RouteErrorPage.tsx', import.meta.url), 'utf8')
const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
const main = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../layouts/AdminLayout.tsx', import.meta.url), 'utf8')
const bookingForm = readFileSync(new URL('../components/bookings/AdminBookingForm.tsx', import.meta.url), 'utf8')
assert.match(page, /Сторінку не вдалося відкрити/)
assert.match(page, /Оновити сторінку/)
assert.match(page, /незбережені зміни/)
assert.equal(page.includes('Unexpected Application Error'), false)
assert.equal(page.includes('localStorage.clear'), false)
assert.match(router, /errorElement: <RouteErrorPage \/>/)
assert.match(main, /noteRecoveredBuild/)
assert.match(main, /hasUnsavedWork\(\)/)
assert.equal(layout.includes('setTimeout'), false, 'a timer must not re-arm the reload')
assert.match(bookingForm, /usePreserveEdits/)
assert.equal(main.includes('serviceWorker'), false)

console.log('chunk reload verified')
