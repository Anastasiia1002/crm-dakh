import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ANALYTICS_NONE, filterAnalyticsAccommodationOptions, groupAnalyticsAccommodationOptions, nextAnalyticsIdFilter, type AnalyticsAccommodationOption } from '@/lib/analytics-summary'
import { cn } from '@/lib/utils'

export function AccommodationMultiSelect({
  label,
  options,
  value,
  onChange,
  loading,
  error,
}: {
  label: string
  options: AnalyticsAccommodationOption[]
  value: string[] | typeof ANALYTICS_NONE | 'all'
  onChange: (value: string[] | typeof ANALYTICS_NONE | 'all') => void
  loading?: boolean
  error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const allIds = options.map((option) => option.id)
  const selected = value === 'all' ? allIds : value === ANALYTICS_NONE ? [] : value
  const visible = useMemo(() => filterAnalyticsAccommodationOptions(options, query), [options, query])
  const groups = useMemo(() => groupAnalyticsAccommodationOptions(visible), [visible])
  const triggerLabel =
    value === 'all'
      ? 'Усі проживання'
      : value === ANALYTICS_NONE
        ? 'Не обрано'
        : `Обрано ${selected.length}`

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="space-y-2">
      <span className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</span>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="min-h-11 w-full justify-between sm:max-w-md"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{triggerLabel}</span>
      </Button>
      {open ? (
        <div className="w-full rounded-md border border-border bg-surface p-3 sm:max-w-md" role="listbox" aria-multiselectable="true">
          <div className="mb-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange('all')}>
              Вибрати всі
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(ANALYTICS_NONE)}>
              Очистити
            </Button>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Назва або номер"
            aria-label="Пошук проживання"
            className="mb-2"
          />
          {loading ? <p className="text-xs text-muted-foreground">Завантажуємо список…</p> : null}
          {error ? <p className="text-xs text-destructive">Не вдалося завантажити повний список.</p> : null}
          <div className="max-h-64 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нічого не знайдено.</p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="mb-3">
                  <p className="mb-1 text-[11px] tracking-[0.12em] text-muted uppercase">{group.label}</p>
                  <ul className="space-y-1">
                    {group.items.map((option) => {
                      const checked = selected.includes(option.id)
                      return (
                        <li key={option.id}>
                          <label className={cn('flex max-w-full items-center gap-2 rounded-sm px-1 py-1 text-sm')}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => {
                                const ids = new Set(selected)
                                if (next === true) ids.add(option.id)
                                else ids.delete(option.id)
                                onChange(nextAnalyticsIdFilter([...ids], allIds))
                              }}
                            />
                            <span className="truncate">{option.label}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
