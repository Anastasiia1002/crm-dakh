import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/format'

function pagesToShow(page: number, pageCount: number) {
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1])
  return [...pages].filter((item) => item >= 1 && item <= pageCount).sort((a, b) => a - b)
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (total === 0) return null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = pagesToShow(page, pageCount)

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Показано {formatCount(from)}–{formatCount(to)} з {formatCount(total)}
      </p>
      <nav className="flex items-center gap-1" aria-label="Сторінки">
        <PageButton label="Попередня сторінка" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-4" />
        </PageButton>
        {pages.map((item, index) => {
          const previous = pages[index - 1]
          const gap = previous !== undefined && item - previous > 1
          return (
            <span key={item} className="flex items-center gap-1">
              {gap ? <span className="px-1 text-sm text-muted-foreground">…</span> : null}
              <PageButton label={`Сторінка ${item}`} current={item === page} onClick={() => onPageChange(item)}>
                {item}
              </PageButton>
            </span>
          )
        })}
        <PageButton label="Наступна сторінка" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="size-4" />
        </PageButton>
      </nav>
    </div>
  )
}

function PageButton({
  children,
  label,
  current = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode
  label: string
  current?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40',
        current ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-muted',
      )}
    >
      {children}
    </button>
  )
}
