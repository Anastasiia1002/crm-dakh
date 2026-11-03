import { useEffect, useState } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { claimStaleChunkReload, isChunkLoadError } from '@/lib/chunk-load'

function alreadyReloaded(path: string) {
  try {
    return window.sessionStorage.getItem('dakh-chunk-reload') === path
  } catch {
    return true
  }
}

export function RouteErrorPage() {
  const error = useRouteError()
  const stale = isChunkLoadError(error)
  const path = `${window.location.pathname}${window.location.search}`
  const [reloading] = useState(() => stale && !alreadyReloaded(path))

  useEffect(() => {
    if (!reloading) return
    try {
      if (!claimStaleChunkReload(error, path, window.sessionStorage)) return
    } catch {
      return
    }
    window.location.reload()
  }, [error, path, reloading])

  function reloadManually() {
    try {
      window.sessionStorage.removeItem('dakh-chunk-reload')
    } catch {
      /* The button still reloads when storage is blocked. */
    }
    window.location.reload()
  }

  const title = stale ? 'Сторінку не вдалося відкрити' : 'Щось пішло не так'
  const detail = stale
    ? 'Після оновлення сайту браузер відкрив стару версію. Оновіть сторінку ще раз.'
    : isRouteErrorResponse(error)
      ? 'Цю сторінку зараз не можна відкрити.'
      : 'Спробуйте оновити сторінку. Бронювання не змінювалось.'

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-serif text-3xl">{reloading ? 'Оновлюємо сторінку…' : title}</h1>
        {reloading ? null : <p className="text-sm text-muted-foreground">{detail}</p>}
        {reloading ? null : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={reloadManually}>
              Оновити сторінку
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/bookings">До списку бронювань</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
