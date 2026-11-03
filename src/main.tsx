import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { claimStaleChunkReload } from '@/lib/chunk-load'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'
import './index.css'

window.addEventListener('vite:preloadError', (event) => {
  const path = `${window.location.pathname}${window.location.search}`
  try {
    if (!claimStaleChunkReload(event, path, window.sessionStorage)) return
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#fbf8f3',
              border: '1px solid #ddd4c6',
              color: '#1e1b17',
              fontFamily: 'Manrope, sans-serif',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
