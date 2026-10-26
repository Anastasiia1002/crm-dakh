import { useRef, type FormEventHandler, type ReactNode } from 'react'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const contentClass =
  'flex h-auto max-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] w-[calc(100%-1rem-env(safe-area-inset-left)-env(safe-area-inset-right))] flex-col overflow-hidden p-0'

export const formDialogSelectContentClass = 'z-[60]'
export const formDialogGridClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0'

export function ScrollableFormDialog({
  title,
  onSubmit,
  children,
  footer,
}: {
  title: string
  onSubmit: (event: Parameters<FormEventHandler<HTMLFormElement>>[0]) => void | Promise<void>
  children: ReactNode
  footer: ReactNode
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  return (
    <DialogContent
      className={contentClass}
      onOpenAutoFocus={(event) => {
        const current = document.activeElement
        returnFocusRef.current = current instanceof HTMLElement && current !== document.body ? current : null
        event.preventDefault()
        bodyRef.current?.focus()
      }}
      onCloseAutoFocus={(event) => {
        const target = returnFocusRef.current
        returnFocusRef.current = null
        if (!target?.isConnected) return
        event.preventDefault()
        target.focus()
      }}
    >
      <DialogHeader className="mb-0 shrink-0 border-b border-border px-6 pr-12 pt-5 pb-4">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          void Promise.resolve(onSubmit(event)).then(() => {
            window.setTimeout(() => {
              const error = bodyRef.current?.querySelector('.text-destructive')
              if (error instanceof HTMLElement) error.scrollIntoView({ block: 'nearest' })
            }, 0)
          })
        }}
      >
        <div
          ref={bodyRef}
          tabIndex={0}
          aria-label="Поля форми"
          className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-4 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset focus-visible:outline-none"
        >
          {children}
        </div>
        <DialogFooter className="mt-0 shrink-0 flex-wrap border-t border-border bg-surface px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {footer}
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
