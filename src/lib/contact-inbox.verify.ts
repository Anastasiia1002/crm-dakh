import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../pages/settings/SettingsPage.tsx', import.meta.url), 'utf8')
const types = readFileSync(new URL('../types/index.ts', import.meta.url), 'utf8')
const api = readFileSync(new URL('../api/settings.ts', import.meta.url), 'utf8')

assert.match(page, /Налаштування/)
assert.match(page, /Контактна інформація/)
assert.match(page, /Email для звернень із сайту/)
assert.match(page, /На цю адресу надходитимуть повідомлення, які гості надсилають через контактну форму сайту DAKH\./)
assert.match(page, /contactInboxEmail: hotel\.contactInboxEmail \?\? ''/)
assert.match(page, /disabled=\{!canEdit\}/)
assert.match(page, /loading=\{update\.isPending\}/)
assert.match(page, /toast\.success\('Налаштування збережено'\)/)
assert.match(page, /notifySettingsError/)
assert.equal(page.includes('localStorage'), false)
assert.match(page, /sm:grid-cols-2/)
assert.match(page, /sm:col-span-2/)
assert.match(page, /user\?\.role === 'owner' \|\| user\?\.role === 'admin'/)
assert.match(types, /contactInboxEmail: string \| null/)
assert.match(types, /contactInboxEmail\?: string/)
assert.match(api, /method: 'PATCH'/)
assert.doesNotMatch(page, /reset\(\)/)

const schema = page.slice(page.indexOf('const hotelSchema'), page.indexOf('const bookingSchema'))
assert.match(schema, /contactInboxEmail:/)
assert.match(schema, /\.email\(/)
assert.match(schema, /\.min\(1/)

console.log('contact inbox settings verified')
