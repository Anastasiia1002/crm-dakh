import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-40 aria-[invalid=true]:border-destructive',
        className,
      )}
      {...props}
    />
  )
}
