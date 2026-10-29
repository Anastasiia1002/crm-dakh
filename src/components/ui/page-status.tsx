import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'

export function PageSkeleton({ label = 'Завантаження сторінки…' }: { label?: string }) {
  return (
    <div className="space-y-4 py-8" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="h-8 max-w-xs animate-pulse rounded-md bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-md bg-surface-muted" />
    </div>
  )
}

export function QueryErrorState({
  error,
  onRetry,
  title = 'Не вдалося завантажити дані',
}: {
  error: unknown
  onRetry: () => void
  title?: string
}) {
  return (
    <div className="space-y-3 border-t border-border py-10">
      <p className="text-sm">{title}</p>
      <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Спробувати ще раз
      </Button>
    </div>
  )
}

export function AuthRestoreState({
  slow = false,
  error,
  onRetry,
}: {
  slow?: boolean
  error?: unknown
  onRetry?: () => void
}) {
  if (error && onRetry) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="font-serif text-2xl">Немає звʼязку із сервером</p>
          <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
          <p className="text-sm text-muted-foreground">
            Якщо сервер щойно прокидався, зачекайте кілька секунд і спробуйте ще раз.
          </p>
          <Button onClick={onRetry}>Спробувати ще раз</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4" aria-busy="true" aria-live="polite">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Завантаження…</p>
        {slow ? (
          <p className="text-sm text-muted-foreground">
            Сервер запускається. Це може зайняти до хвилини після простою.
          </p>
        ) : null}
      </div>
    </div>
  )
}
