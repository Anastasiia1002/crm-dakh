export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: string[]

  constructor(message: string, status: number, code?: string, details?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}
