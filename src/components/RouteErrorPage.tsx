import { useEffect, useState } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { claimStaleChunkReload, currentBuildId, hasUnsavedWork, isChunkLoadError } from '@/lib/chunk-load'

function alreadyReloaded(buildId: string) {
  try {
    return window.sessionStorage.getItem('dakh-chunk-reload') === buildId
  } catch {
    return true
  }
}

export function RouteErrorPage() {
  const error = useRouteError()
  const stale = isChunkLoadError(error)
  const unsaved = hasUnsavedWork()
  const buildId = currentBuildId(document)
  const [reloading] = useState(() => stale && !unsaved && !alreadyReloaded(buildId))

  useEffect(() => {
    if (!reloading) return
    try {
      if (!claimStaleChunkReload(error, buildId, window.sessionStorage, { unsaved })) return
    } catch {
      return
    }
    window.location.reload()
  }, [buildId, error, reloading, unsaved])

  function reloadManually() {
    window.location.reload()
  }

  const title = stale ? 'Сторінку не вдалося відкрити' : 'Щось пішло не так'
  const detail = stale
    ? unsaved
      ? 'Після оновлення сайту частина сторінки не завантажилась. Автоматичне оновлення вимкнене, бо в формі є незбережені зміни.'
      : 'Після оновлення сайту браузер відкрив стару версію. Сесію не скинуто.'
    : isRouteErrorResponse(error)
      ? 'Цю сторінку зараз не можна відкрити.'
      : 'Спробуйте оновити сторінку. Бронювання і вхід не змінювались.'

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md border border-border bg-surface px-6 py-8 text-center shadow-sm">
        <p className="text-[11px] tracking-[0.18em] text-muted uppercase">DAKH</p>
        <h1 className="mt-3 font-serif text-3xl font-medium">{reloading ? 'Оновлюємо сторінку…' : title}</h1>
        {reloading ? null : <p className="mt-3 text-sm text-muted-foreground">{detail}</p>}
        {reloading ? null : (
          <div className="mt-6 flex justify-center">
            <Button type="button" onClick={reloadManually}>
              Оновити сторінку
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
