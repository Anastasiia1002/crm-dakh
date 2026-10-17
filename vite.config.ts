import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { assertViteApiBaseUrl } from './src/lib/api-env.ts'

const githubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Fail the Vite process early when API origin is missing or unsafe for this mode.
  assertViteApiBaseUrl(env.VITE_API_BASE_URL, mode)

  return {
    base: githubPages ? '/crm-dakh/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
