import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { bookingRoomFilterLabel, roomsGroupedByKind } from '@/lib/accommodation-labels'
import { cn } from '@/lib/utils'
import type { RoomTypeKind } from '@/types'

type Unit = { id: string; name: string | null; number: string; roomTypeId: string; active?: boolean }
type Type = { id: string; name: string; kind: RoomTypeKind }

export function UnitMultiSelect({
  rooms,
  roomTypes,
  value,
  onChange,
  loading,
  error,
}: {
  rooms: readonly Unit[]
  roomTypes: readonly Type[]
  value: string[]
  onChange: (value: string[]) => void
  loading?: boolean
  error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const typeName = (roomTypeId: string) => roomTypes.find((type) => type.id === roomTypeId)?.name
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rooms
    return rooms.filter((room) => bookingRoomFilterLabel(room, typeName(room.roomTypeId)).toLowerCase().includes(term))
  }, [query, rooms, roomTypes])
  const groups = roomsGroupedByKind(filtered, roomTypes)

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
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="min-h-11 w-full justify-between"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{value.length ? `Обрано ${value.length}` : 'Оберіть номери або будиночки'}</span>
      </Button>
      {open ? (
        <div className="w-full rounded-md border border-border bg-background p-3" role="listbox" aria-multiselectable="true">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук"
            aria-label="Пошук номера або будиночка"
            className="mb-2"
          />
          {loading ? <p className="text-xs text-muted-foreground">Завантажуємо список…</p> : null}
          {error ? <p className="text-xs text-destructive">Не вдалося завантажити повний список розміщень.</p> : null}
          <div className="max-h-64 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нічого не знайдено.</p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="mb-3">
                  <p className="mb-1 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{group.label}</p>
                  <ul className="space-y-1">
                    {group.items.map((room) => {
                      const checked = value.includes(room.id)
                      return (
                        <li key={room.id}>
                          <label className={cn('flex max-w-full items-center gap-2 rounded-sm px-1 py-1 text-sm')}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => {
                                const ids = new Set(value)
                                if (next === true) ids.add(room.id)
                                else ids.delete(room.id)
                                onChange([...ids])
                              }}
                            />
                            <span className="truncate">{bookingRoomFilterLabel(room, typeName(room.roomTypeId))}</span>
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
