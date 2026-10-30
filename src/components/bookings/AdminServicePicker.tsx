import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { QueryErrorState } from '@/components/ui/page-status'
import {
  formatCatalogPrice,
  serviceDisplayName,
  setServiceQuantity,
  toggleServiceSelection,
  type AdminServiceCatalogItem,
  type AdminServiceSelection,
} from '@/lib/admin-services'

type SavedLine = {
  serviceId: string
  quantity: number
  unitPrice: string
}

type Props = {
  catalog: AdminServiceCatalogItem[]
  status: 'loading' | 'error' | 'ready'
  error: unknown
  onRetry: () => void
  selected: AdminServiceSelection[]
  saved: SavedLine[]
  disabled?: boolean
  selectionError?: string | null
  onChange: (next: AdminServiceSelection[]) => void
}

export function AdminServicePicker({
  catalog,
  status,
  error,
  onRetry,
  selected,
  saved,
  disabled,
  selectionError,
  onChange,
}: Props) {
  const selectedIds = new Set(selected.map((row) => row.serviceId))
  const orphanIds = selected.filter((row) => !catalog.some((item) => item.id === row.serviceId))

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Завантаження каталогу послуг…</p>
  }

  if (status === 'error') {
    return (
      <div className="space-y-2">
        <QueryErrorState title="Не вдалося завантажити послуги" error={error} onRetry={onRetry} />
        {selected.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Обрані послуги збережено в формі. Нові рядки не додаються, доки каталог не завантажиться.
          </p>
        ) : null}
      </div>
    )
  }

  if (catalog.length === 0 && orphanIds.length === 0) {
    return <p className="text-sm text-muted-foreground">Активних послуг немає.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Суму рахує сервер. Ціна з каталогу застосовується лише до нових рядків.
      </p>
      <ul className="space-y-3">
        {catalog.map((item) => {
          const checked = selectedIds.has(item.id)
          const quantity = selected.find((row) => row.serviceId === item.id)?.quantity ?? 1
          return (
            <li key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-w-0 items-start gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => onChange(toggleServiceSelection(selected, item.id, value === true))}
                />
                <span>
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 tabular-nums text-muted-foreground">{formatCatalogPrice(item.price)}</span>
                  {item.description ? <span className="mt-0.5 block text-muted-foreground">{item.description}</span> : null}
                </span>
              </label>
              {checked ? (
                <Input
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  className="w-20"
                  disabled={disabled}
                  value={quantity}
                  aria-label={`Кількість: ${item.name}`}
                  onChange={(event) => onChange(setServiceQuantity(selected, item.id, Number(event.target.value)))}
                />
              ) : null}
            </li>
          )
        })}
        {orphanIds.map((row) => {
          const savedLine = saved.find((item) => item.serviceId === row.serviceId)
          return (
            <li key={row.serviceId} className="space-y-1 rounded-md border border-border p-3">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked
                  disabled={disabled}
                  onCheckedChange={(value) => onChange(toggleServiceSelection(selected, row.serviceId, value === true))}
                />
                <span>
                  <span className="font-medium">{serviceDisplayName(row.serviceId, catalog)}</span>
                  {savedLine ? (
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      збережена ціна {formatCatalogPrice(savedLine.unitPrice)}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-muted-foreground">
                    Немає в активному каталозі. Рядок не прибирається сам. Збережена ціна лишається, доки послугу не
                    знімуть.
                  </span>
                </span>
              </label>
              <Input
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                className="w-20"
                disabled={disabled}
                value={row.quantity}
                aria-label={`Кількість збереженої послуги ${row.serviceId.slice(0, 8)}`}
                onChange={(event) => onChange(setServiceQuantity(selected, row.serviceId, Number(event.target.value)))}
              />
            </li>
          )
        })}
      </ul>
      {selectionError ? <p className="text-xs text-destructive">{selectionError}</p> : null}
    </div>
  )
}
