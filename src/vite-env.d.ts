/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Set to "true" only after backend #26 is deployed and length-stay night windows are verified. */
  readonly VITE_LENGTH_STAY_NIGHT_WINDOW?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
