/**
 * Vercel SPA fallback must serve index.html for CRM routes and leave
 * GitHub Pages on /crm-dakh/ with its 404.html copy.
 * Run: npx --yes tsx src/lib/vercel-spa.verify.ts
 */
import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as {
  rewrites?: { source: string; destination: string }[]
}

assert(Array.isArray(vercel.rewrites) && vercel.rewrites.length === 1, 'one SPA rewrite')
const rewrite = vercel.rewrites[0]
assert(rewrite?.source === '/((?!api/).*)', 'rewrite skips /api/')
assert(rewrite?.destination === '/index.html', 'frontend routes serve index.html')

const route = new RegExp(`^${rewrite.source}$`)

function fallsBack(pathname: string): boolean {
  return route.test(pathname)
}

assert(fallsBack('/login'), 'direct /login')
assert(fallsBack('/admin'), 'direct /admin')
assert(fallsBack('/admin/bookings'), 'direct /admin/bookings')
assert(fallsBack('/admin/calendar'), 'direct /admin/calendar')
assert(fallsBack('/admin/bookings/11111111-1111-4111-8111-111111111111'), 'direct booking detail')
assert(!fallsBack('/api/auth/login'), 'API paths are not rewritten')
assert(!fallsBack('/api/admin/bookings'), 'admin API paths are not rewritten')

const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8')
assert(viteConfig.includes("process.env.GITHUB_PAGES === 'true'"), 'GitHub Pages build is explicit')
assert(viteConfig.includes("base: githubPages ? '/crm-dakh/' : '/'"), 'Vercel base stays / and Pages keeps /crm-dakh/')

const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes('import.meta.env.BASE_URL'), 'router basename follows the Vite base')
assert(router.includes("path: '/login'"), 'login route')
assert(router.includes("navigate('/login')") || readFileSync(new URL('../components/layout/Header.tsx', import.meta.url), 'utf8').includes("navigate('/login')"), 'logout returns to /login')

const pages = readFileSync(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8')
assert(pages.includes("GITHUB_PAGES: 'true'"), 'Pages workflow sets the base')
assert(pages.includes('cp dist/index.html dist/404.html'), 'Pages keeps the 404.html fallback')

console.log('All Vercel SPA routing checks passed.')
