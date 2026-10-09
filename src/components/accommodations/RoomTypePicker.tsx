import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAdminRoomType, useAdminRoomTypes } from '@/hooks/useHotel'
import { roomTypeKindLabel } from '@/lib/labels'
import type { RoomTypeKind } from '@/types'

const TYPE_SEARCH_LIMIT = 20

/**
 * Server-side searchable RoomType picker.
 * When `kind` is set, results are scoped and mismatched selections are warned (not auto-cleared).
 * When `kind` is omitted, ROOM and COTTAGE categories are both selectable.
 */
export function RoomTypePicker({
  value,
  kind,
  onChange,
  disabled,
  activeOnly,
}: {
  value: string
  kind?: RoomTypeKind
  onChange: (value: string) => void
  disabled?: boolean
  /** When true (create flow), only active categories are listed. */
  activeOnly: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [applied, setApplied] = useState('')
  const selected = useAdminRoomType(value || undefined)
  const results = useAdminRoomTypes({
    page: 1,
    limit: TYPE_SEARCH_LIMIT,
    search: applied || undefined,
    active: activeOnly ? true : undefined,
    kind,
  })

  const selectedCompatible = !kind || selected.data?.kind === kind
  const selectedLabel = !value
    ? 'Оберіть категорію'
    : selected.isLoading
      ? 'Завантаження…'
      : selected.data
        ? selectedCompatible
          ? `${selected.data.name}${selected.data.active ? '' : ' (вимкнена)'} · ${roomTypeKindLabel[selected.data.kind]} (${selected.data.slug})`
          : `${selected.data.name} — інший тип (${roomTypeKindLabel[selected.data.kind]})`
        : 'Категорію не знайдено'

  const options = useMemo(() => {
    const items = results.data?.items ?? []
    if (!selected.data || !selectedCompatible) return items
    if (items.some((item) => item.id === selected.data.id)) return items
    return [selected.data, ...items]
  }, [results.data?.items, selected.data, selectedCompatible])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal"
        disabled={disabled}
        onClick={() => {
          setDraft(applied)
          setOpen(true)
        }}
      >
        {selectedLabel}
      </Button>
      {value && selected.data && kind && !selectedCompatible ? (
        <p className="mt-1 text-xs text-destructive">
          Поточна категорія має тип «{roomTypeKindLabel[selected.data.kind]}». Оберіть категорію типу «
          {roomTypeKindLabel[kind]}» — поточний вибір не змінюється автоматично.
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {kind ? `Обрати категорію (${roomTypeKindLabel[kind]})` : 'Обрати категорію'}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setApplied(draft.trim())
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Пошук за назвою або slug"
              autoFocus
            />
            <Button type="submit" variant="outline">
              Знайти
            </Button>
          </form>
          <div className="max-h-64 space-y-1 overflow-y-auto border-t border-border pt-3">
            {results.isLoading ? <p className="text-sm text-muted-foreground">Завантаження…</p> : null}
            {results.isError ? (
              <div className="space-y-2">
                <p className="text-sm">Не вдалося завантажити категорії</p>
                <Button size="sm" variant="outline" onClick={() => void results.refetch()}>
                  Спробувати ще раз
                </Button>
              </div>
            ) : null}
            {!results.isLoading && !results.isError && options.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нічого не знайдено. Змініть пошук.</p>
            ) : null}
            {options.map((type) => (
              <button
                key={type.id}
                type="button"
                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange(type.id)
                  setOpen(false)
                }}
              >
                <span>
                  {type.name}
                  {!type.active ? ' (вимкнена)' : ''}
                  {type.id === value ? ' · поточна' : ''}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {type.slug} · {roomTypeKindLabel[type.kind]}
                </span>
              </button>
            ))}
            {(results.data?.pagination.total ?? 0) > TYPE_SEARCH_LIMIT ? (
              <p className="px-3 pt-2 text-xs text-muted-foreground">
                Показано {TYPE_SEARCH_LIMIT} з {results.data?.pagination.total}. Уточніть пошук, щоб знайти інші.
              </p>
            ) : null}
          </div>
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
