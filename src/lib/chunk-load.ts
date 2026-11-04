const RELOAD_KEY = 'dakh-chunk-reload'

type ReloadStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type ScriptDocument = {
  querySelector(selector: string): { getAttribute(name: string): string | null } | null
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
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Expected a JavaScript-or-Wasm module script/i.test(
    errorText(error),
  )
}

export function currentBuildId(doc: ScriptDocument): string {
  return doc.querySelector('script[type="module"][src]')?.getAttribute('src') ?? 'unknown'
}

/**
 * One automatic reload for this deployed shell. A second failure of the same
 * script URL stays on the recovery screen. A newer shell clears the guard.
 * Unsaved edits block the automatic reload; the recovery screen stays up.
 */
export function claimStaleChunkReload(
  error: unknown,
  buildId: string,
  storage: ReloadStore,
  options: { unsaved?: boolean } = {},
) {
  if (!isChunkLoadError(error)) return false
  if (options.unsaved) return false
  if (storage.getItem(RELOAD_KEY) === buildId) return false
  storage.setItem(RELOAD_KEY, buildId)
  return true
}

export function noteRecoveredBuild(buildId: string, storage: Pick<ReloadStore, 'getItem' | 'removeItem'>) {
  const previous = storage.getItem(RELOAD_KEY)
  if (previous && previous !== buildId) storage.removeItem(RELOAD_KEY)
}

export function clearStaleChunkReload(storage: Pick<ReloadStore, 'removeItem'>) {
  storage.removeItem(RELOAD_KEY)
}

let unsavedWork = false

export function setUnsavedWork(active: boolean) {
  unsavedWork = active
}

export function hasUnsavedWork() {
  return unsavedWork
}
