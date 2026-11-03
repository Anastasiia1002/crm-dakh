const RELOAD_KEY = 'dakh-chunk-reload'

type ReloadStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'payload' in error) {
    return errorText((error as { payload: unknown }).payload)
  }
  return ''
}

export function isChunkLoadError(error: unknown) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    errorText(error),
  )
}

/** One automatic reload per address. A second failure on the same address stays on the error screen. */
export function claimStaleChunkReload(error: unknown, path: string, storage: ReloadStore) {
  if (!isChunkLoadError(error)) return false
  if (storage.getItem(RELOAD_KEY) === path) return false
  storage.setItem(RELOAD_KEY, path)
  return true
}

export function clearStaleChunkReload(storage: Pick<ReloadStore, 'removeItem'>) {
  storage.removeItem(RELOAD_KEY)
}
