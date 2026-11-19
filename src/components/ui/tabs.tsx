import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex min-h-11 gap-1 overflow-x-auto scroll-thin border-b border-border', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px inline-flex min-h-11 shrink-0 items-center rounded-t-md border-b-[3px] border-transparent px-3 text-sm font-medium text-muted-foreground outline-none transition-colors',
        'hover:bg-primary/5 hover:text-foreground',
        'focus-visible:bg-primary/5 focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
        'data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-6 outline-none', className)} {...props} />
}
