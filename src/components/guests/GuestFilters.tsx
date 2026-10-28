import { Input } from '@/components/ui/input'

export function GuestFilters({
  search,
  onSearch,
  onClear,
}: {
  search: string
  onSearch: (search: string) => void
  onClear: () => void
}) {
  const dirty = search.trim().length > 0

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Пошук за ім'ям, телефоном або email"
        aria-label="Пошук за ім'ям, телефоном або email"
        className="max-w-xl"
      />
      <button
        type="button"
        className="h-10 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
        onClick={onClear}
        disabled={!dirty}
      >
        Очистити пошук
      </button>
    </div>
  )
}
