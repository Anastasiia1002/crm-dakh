import { EllipsisVertical } from 'lucide-react'
import { type ReactNode, type RefObject, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ActionsMenu({
  label = 'Дії',
  children,
  triggerRef: forwardedRef,
}: {
  label?: string
  children: ReactNode
  triggerRef?: RefObject<HTMLButtonElement | null>
}) {
  const localRef = useRef<HTMLButtonElement>(null)
  const triggerRef = forwardedRef ?? localRef

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          size="icon"
          variant="ghost"
          aria-haspopup="menu"
          aria-label={label}
          className="size-11 bg-transparent shadow-none hover:bg-transparent"
        >
          <EllipsisVertical className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={16}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
