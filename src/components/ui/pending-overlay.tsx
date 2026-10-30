import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  abortDoesNotCancelServerMessage,
  createUncertainCopy,
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
  phase: Extract<MutationPhase, 'validating' | 'submitting' | 'uncertain'>
  onStopWaiting?: () => void
  onCheckList?: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const copy = mutationOverlayCopy(kind, phase === 'uncertain' ? 'submitting' : phase)
  const uncertain = phase === 'uncertain'
  const createUncertain = uncertain && kind === 'create'
  const title = createUncertain ? createUncertainCopy().title : uncertain ? 'Не вдалося підтвердити результат операції' : copy.title
  const detail = createUncertain ? createUncertainCopy().detail : uncertain ? uncertainOutcomeMessage() : copy.detail
  const allowStop = Boolean(onStopWaiting) && kind !== 'create'

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () =>
      [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    const initial = focusable()[0] ?? panel
    initial.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [kind, phase])

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#1c1a17]/45 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-busy={!uncertain}
      aria-labelledby="pending-overlay-title"
      aria-describedby="pending-overlay-detail"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-none outline-none"
      >
        <div className="flex items-start gap-3">
          {!uncertain ? (
            <Loader2 className="mt-1 size-5 shrink-0 motion-safe:animate-spin" aria-hidden />
          ) : null}
          <div className="space-y-2">
            <h2 id="pending-overlay-title" className="font-serif text-2xl font-medium">
              {title}
            </h2>
            <p id="pending-overlay-detail" className="text-sm text-muted-foreground" aria-live="polite">
              {detail}
            </p>
            {uncertain ? <p className="text-sm text-muted-foreground">{abortDoesNotCancelServerMessage()}</p> : null}
          </div>
        </div>
        {uncertain ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {allowStop ? (
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
