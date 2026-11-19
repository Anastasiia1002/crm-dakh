import { type ReactNode, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ActionsMenu({
  label = 'Дії',
  children,
}: {
  label?: string
  children: ReactNode
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} size="sm" variant="outline" aria-haspopup="menu">
          {label}
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
