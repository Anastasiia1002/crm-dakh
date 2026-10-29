import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  abortDoesNotCancelServerMessage,
  mutationOverlayCopy,
  uncertainOutcomeMessage,
  type MutationKind,
  type MutationPhase,
} from '@/lib/mutation-action'

export function PendingOverlay({
  kind,
  phase,
  onStopWaiting,
  onCheckList,
}: {
  kind: MutationKind
  phase: Extract<MutationPhase, 'submitting' | 'uncertain'>
  onStopWaiting?: () => void
  onCheckList?: () => void
}) {
  const copy = mutationOverlayCopy(kind)
  const uncertain = phase === 'uncertain'

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#1c1a17]/45 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-busy={!uncertain}
      aria-labelledby="pending-overlay-title"
      aria-describedby="pending-overlay-detail"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-none">
        <div className="flex items-start gap-3">
          {!uncertain ? <Loader2 className="mt-1 size-5 shrink-0 animate-spin" aria-hidden /> : null}
          <div className="space-y-2">
            <h2 id="pending-overlay-title" className="font-serif text-2xl font-medium">
              {uncertain ? 'Не вдалося підтвердити результат операції' : copy.title}
            </h2>
            <p id="pending-overlay-detail" className="text-sm text-muted-foreground">
              {uncertain ? uncertainOutcomeMessage() : copy.detail}
            </p>
            {uncertain ? <p className="text-sm text-muted-foreground">{abortDoesNotCancelServerMessage()}</p> : null}
          </div>
        </div>
        {uncertain ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {onStopWaiting ? (
              <Button type="button" variant="outline" onClick={onStopWaiting}>
                Зупинити очікування
              </Button>
            ) : null}
            {onCheckList ? (
              <Button type="button" onClick={onCheckList}>
                Перевірити список бронювань
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Не закривайте вкладку, доки запит не завершиться.</p>
        )}
      </div>
    </div>
  )
}
