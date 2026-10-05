export function delay(ms = 90) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}
