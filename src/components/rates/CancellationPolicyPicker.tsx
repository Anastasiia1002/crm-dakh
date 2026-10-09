import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAdminCancellationPolicies, useAdminCancellationPolicy } from '@/hooks/useHotel'

const PAGE_SIZE = 20

/**
 * Server-side searchable CancellationPolicy picker.
 * Supports null selection (Без правила). Preserves inactive current policy when editing.
 */
export function CancellationPolicyPicker({
  value,
  onChange,
  disabled,
  activeOnly,
}: {
  /** Empty string means no policy (null on the API). */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  activeOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const selected = useAdminCancellationPolicy(value || undefined)
  const results = useAdminCancellationPolicies({
    page,
    limit: PAGE_SIZE,
    search: applied || undefined,
    active: activeOnly ? true : undefined,
  })

  const selectedLabel = !value
    ? 'Без правила'
    : selected.isLoading
      ? 'Завантаження…'
      : selected.data
        ? `${selected.data.name}${selected.data.active ? '' : ' (вимкнене)'}`
        : 'Правило не знайдено'

  const options = useMemo(() => {
    const items = results.data?.items ?? []
    if (!selected.data) return items
    if (items.some((item) => item.id === selected.data.id)) return items
    return [selected.data, ...items]
  }, [results.data?.items, selected.data])

  const total = results.data?.pagination.total ?? 0
  const totalPages = results.data?.pagination.totalPages ?? 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal"
        disabled={disabled}
        onClick={() => {
          setDraft(applied)
          setPage(1)
          setOpen(true)
        }}
      >
        {selectedLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обрати правило скасування</DialogTitle>
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
              placeholder="Пошук за назвою"
              autoFocus
            />
            <Button type="submit" variant="outline">
              Знайти
            </Button>
          </form>
          <div className="max-h-64 space-y-1 overflow-y-auto border-t border-border pt-3">
            <button
              type="button"
              className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              <span>Без правила</span>
              <span className="text-xs text-muted-foreground">Тариф без окремого правила скасування</span>
            </button>
            {results.isLoading ? <p className="text-sm text-muted-foreground">Завантаження…</p> : null}
            {results.isError ? (
              <div className="space-y-2 px-3">
                <p className="text-sm">Не вдалося завантажити правила</p>
                <Button size="sm" variant="outline" onClick={() => void results.refetch()}>
                  Спробувати ще раз
                </Button>
              </div>
            ) : null}
            {!results.isLoading && !results.isError && options.length === 0 ? (
              <p className="px-3 text-sm text-muted-foreground">Нічого не знайдено. Змініть пошук.</p>
            ) : null}
            {options.map((policy) => (
              <button
                key={policy.id}
                type="button"
                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange(policy.id)
                  setOpen(false)
                }}
              >
                <span>
                  {policy.name}
                  {!policy.active ? ' (вимкнене)' : ''}
                  {policy.id === value ? ' · поточне' : ''}
                </span>
                <span className="text-xs text-muted-foreground">
                  За {policy.hoursBefore} год. до заїзду
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
