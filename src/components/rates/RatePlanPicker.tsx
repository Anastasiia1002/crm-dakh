import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAdminRatePlan, useAdminRatePlans } from '@/hooks/useHotel'
import { ratePlanTypeLabel } from '@/lib/labels'

const PAGE_SIZE = 20

/**
 * Server-side searchable RatePlan picker (paginated, no first-100 truncation).
 * Preserves the current selection when editing, including inactive plans.
 */
export function RatePlanPicker({
  value,
  onChange,
  disabled,
  activeOnly,
  allowEmpty,
  emptyLabel = 'Усі тарифи',
  placeholder = 'Оберіть тариф',
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  activeOnly?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const selected = useAdminRatePlan(value || undefined)
  const results = useAdminRatePlans({
    page,
    limit: PAGE_SIZE,
    search: applied || undefined,
    active: activeOnly ? true : undefined,
  })

  const selectedLabel = !value
    ? allowEmpty
      ? emptyLabel
      : placeholder
    : selected.isLoading
      ? 'Завантаження…'
      : selected.data
        ? `${selected.data.name}${selected.data.active ? '' : ' (вимкнений)'} · ${selected.data.code}`
        : 'Тариф не знайдено'

  const options = useMemo(() => {
    const items = results.data?.items ?? []
    if (!selected.data) return items
    if (items.some((item) => item.id === selected.data.id)) return items
    // Keep current (possibly inactive / off-page) selection visible.
    return [selected.data, ...items]
  }, [results.data?.items, selected.data])

  const total = results.data?.pagination.total ?? 0
  const totalPages = results.data?.pagination.totalPages ?? 0

  function openPicker() {
    setDraft(applied)
    setPage(1)
    setOpen(true)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal"
        disabled={disabled}
        onClick={openPicker}
      >
        {selectedLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обрати тариф</DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setApplied(draft.trim())
              setPage(1)
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Пошук за назвою або кодом"
              autoFocus
            />
            <Button type="submit" variant="outline">
              Знайти
            </Button>
          </form>
          <div className="max-h-64 space-y-1 overflow-y-auto border-t border-border pt-3">
            {allowEmpty ? (
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                <span>{emptyLabel}</span>
              </button>
            ) : null}
            {results.isLoading ? <p className="text-sm text-muted-foreground">Завантаження…</p> : null}
            {results.isError ? (
              <div className="space-y-2 px-3">
                <p className="text-sm">Не вдалося завантажити тарифи</p>
                <Button size="sm" variant="outline" onClick={() => void results.refetch()}>
                  Спробувати ще раз
                </Button>
              </div>
            ) : null}
            {!results.isLoading && !results.isError && options.length === 0 ? (
              <p className="px-3 text-sm text-muted-foreground">Нічого не знайдено. Змініть пошук.</p>
            ) : null}
            {options.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange(plan.id)
                  setOpen(false)
                }}
              >
                <span>
                  {plan.name}
                  {!plan.active ? ' (вимкнений)' : ''}
                  {plan.id === value ? ' · поточний' : ''}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {plan.code} · {ratePlanTypeLabel[plan.type]}
                </span>
              </button>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                Сторінка {page} з {totalPages} · усього {total}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || results.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || results.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Далі
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Закрити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
