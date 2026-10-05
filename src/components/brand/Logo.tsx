import { cn } from '@/lib/utils'

export function Logo({
  className,
  variant = 'light',
}: {
  className?: string
  variant?: 'light' | 'dark'
}) {
  return (
    <img
      src={variant === 'dark' ? `${import.meta.env.BASE_URL}logo-dakh-dark.png` : `${import.meta.env.BASE_URL}logo-dakh.png`}
      alt="DAKH"
      className={cn('h-auto w-40', className)}
    />
  )
}
