import {
  AirVent,
  Bath,
  BedDouble,
  BookOpen,
  Car,
  Check,
  Circle,
  Coffee,
  Droplets,
  Flame,
  Lock,
  Plug,
  Shield,
  Sun,
  Trees,
  Utensils,
  Waves,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { amenityGroups, toggleAmenityKey } from '@/lib/amenities'
import { cn } from '@/lib/utils'
import type { Amenity } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  cctv: Shield,
  'fire-extinguisher': Shield,
  'first-aid-kit': Shield,
  'carbon-monoxide-detector': Shield,
  'smoke-detector': Shield,
  'sea-view': Waves,
  'estuary-view': Waves,
  'mountain-view': Trees,
  'lake-view': Waves,
  'forest-view': Trees,
  'river-view': Waves,
  toiletries: Bath,
  'hair-dryer': Bath,
  shampoo: Droplets,
  'shower-gel': Droplets,
  'hot-water': Droplets,
  'washing-machine': Droplets,
  hangers: BedDouble,
  'bed-linen': BedDouble,
  'blackout-curtains': BedDouble,
  books: BookOpen,
  'game-console': BookOpen,
  projector: BookOpen,
  'air-conditioning': AirVent,
  fireplace: Flame,
  fan: AirVent,
  heater: Flame,
  wifi: Wifi,
  'dedicated-workspace': Wifi,
  kitchen: Utensils,
  refrigerator: Utensils,
  microwave: Utensils,
  'cooking-utensils': Utensils,
  tableware: Utensils,
  'electric-stove': Utensils,
  kettle: Coffee,
  'wine-glasses': Coffee,
  'bbq-equipment': Flame,
  'dining-table': Utensils,
  coffee: Coffee,
  tea: Coffee,
  'swimming-pool': Waves,
  'hot-tub': Bath,
  sauna: Flame,
  jacuzzi: Bath,
  'waterfront-promenade': Waves,
  'nearby-forest': Trees,
  'nearby-river': Waves,
  'nearby-lake': Waves,
  'nearby-mountains': Trees,
  'private-terrace': Sun,
  backyard: Trees,
  'fire-pit': Flame,
  'outdoor-furniture': Sun,
  'outdoor-kitchen': Utensils,
  barbecue: Flame,
  firewood: Flame,
  'fire-starters': Flame,
  'sun-umbrellas': Sun,
  generator: Plug,
  'solar-panels': Sun,
  inverter: Plug,
  'free-on-site-parking': Car,
  'free-off-site-parking': Car,
  'long-term-stays': BedDouble,
  'smart-lock': Lock,
  'cleaning-supplies': Droplets,
}

export function AmenityPicker({
  catalog,
  selected,
  disabled,
  loading,
  error,
  onChange,
}: {
  catalog: readonly Amenity[]
  selected: readonly string[] | null
  disabled?: boolean
  loading?: boolean
  error?: string | null
  onChange: (keys: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const selectedKeys = selected ?? []
  const groups = amenityGroups(catalog, selectedKeys, query)
  const selectedCount = selectedKeys.length

  return (
    <section className="space-y-3 rounded-lg border border-border p-3" aria-labelledby="amenity-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="amenity-heading" className="text-sm font-medium">
            Зручності
          </h3>
          <p className="text-xs text-muted-foreground">
            {selected === null
              ? 'Завантажуємо збережені зручності.'
              : `Обрано ${selectedCount}. Спільні для всіх розміщень цього типу.`}
          </p>
        </div>
        {selectedCount > 0 && !confirmClear ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirmClear(true)}>
            Очистити вибір
          </Button>
        ) : null}
      </div>
      {confirmClear ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <p>Очистити всі обрані зручності?</p>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabled}
            onClick={() => {
              onChange([])
              setConfirmClear(false)
            }}
          >
            Очистити
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
            Залишити
          </Button>
        </div>
      ) : null}
      <Input
        id="amenity-search"
        value={query}
        disabled={disabled || loading}
        placeholder="Пошук зручності"
        aria-label="Пошук зручності"
        onChange={(event) => setQuery(event.target.value)}
      />
      {loading ? <p className="text-sm text-muted-foreground">Завантажуємо зручності…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нічого не знайдено. Обрані зручності збережено.</p>
      ) : null}
      <div className="max-h-72 overflow-y-auto overscroll-contain border-t border-border">
        {groups.map((group) => (
          <div key={group.category} className="pt-1.5 first:pt-1">
            <h4 className="sticky top-0 z-[1] bg-background px-1 pb-0.5 text-[0.68rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {group.label}
            </h4>
            <ul className="divide-y divide-border/70">
              {group.items.map((amenity) => {
                const pressed = selectedKeys.includes(amenity.key)
                const Icon = ICONS[amenity.iconKey] ?? Circle
                const locked = !amenity.isActive && !pressed
                return (
                  <li key={amenity.key}>
                    <button
                      type="button"
                      aria-pressed={pressed}
                      disabled={disabled || locked}
                      className={cn(
                        'flex min-h-9 w-full min-w-0 items-center gap-2 px-1.5 py-1 text-left text-[13px] leading-snug',
                        pressed ? 'bg-primary/10 text-foreground' : 'bg-transparent text-foreground/85',
                        'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        'disabled:opacity-50',
                      )}
                      onClick={() => onChange(toggleAmenityKey(selectedKeys, amenity.key))}
                    >
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 break-words">{amenity.labelUk}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-[3px] border',
                          pressed
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/35 bg-background',
                        )}
                      >
                        {pressed ? <Check className="size-3" strokeWidth={2.5} /> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
