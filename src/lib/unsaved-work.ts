import { useEffect } from 'react'
import { setUnsavedWork } from '@/lib/chunk-load'

/** Keeps a stale-chunk reload from wiping a form the user is still editing. */
export function usePreserveEdits(active: boolean) {
  useEffect(() => {
    setUnsavedWork(active)
  }, [active])

  useEffect(() => {
    return () => {
      window.setTimeout(() => setUnsavedWork(false), 1500)
    }
  }, [])
}
