/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** "true" on Silk production and GitHub Pages builds; optional for local/staging. */
  readonly VITE_LENGTH_STAY_NIGHT_WINDOW?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
