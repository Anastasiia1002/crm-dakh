import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accommodationImageRejection, validateAccommodationImageFile } from '@/lib/accommodation-editor'
import { cn } from '@/lib/utils'

export type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
  error: string | null
}

export function revokePendingPhotos(photos: readonly PendingPhoto[]) {
  for (const photo of photos) URL.revokeObjectURL(photo.previewUrl)
}

export function filesToPendingPhotos(list: FileList | File[]): { accepted: PendingPhoto[]; rejected: string[] } {
  const accepted: PendingPhoto[] = []
  const rejected: string[] = []
  for (const file of Array.from(list)) {
    const result = validateAccommodationImageFile(file)
    if (!result.ok) {
      rejected.push(accommodationImageRejection(result.reason, file.name))
      continue
    }
    accepted.push({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      error: null,
    })
  }
  return { accepted, rejected }
}

export function PendingAccommodationPhotos({
  photos,
  canWrite,
  fileErrors,
  onChange,
  onFileErrors,
}: {
  photos: PendingPhoto[]
  canWrite: boolean
  fileErrors: string[]
  onChange: (photos: PendingPhoto[]) => void
  onFileErrors: (errors: string[]) => void
}) {
  function addFiles(list: FileList | File[]) {
    const { accepted, rejected } = filesToPendingPhotos(list)
    onFileErrors(rejected)
    if (accepted.length > 0) onChange([...photos, ...accepted])
  }

  function move(id: string, direction: -1 | 1) {
    const index = photos.findIndex((photo) => photo.id === id)
    const next = index + direction
    if (index < 0 || next < 0 || next >= photos.length) return
    const copy = [...photos]
    const current = copy[index]
    const target = copy[next]
    if (!current || !target) return
    copy[index] = target
    copy[next] = current
    onChange(copy)
  }

  function remove(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-3" data-pending-photos>
      <h2 className="font-serif text-2xl font-medium">Фото</h2>
      <p className="text-sm text-muted-foreground">
        Оберіть фото зараз. Вони завантажаться після збереження розміщення. JPG, PNG і WebP, до 50 МБ.
      </p>
      {canWrite ? (
        <label
          data-photo-drop
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted-foreground"
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files)
              event.target.value = ''
            }}
          />
          Натисніть або перетягніть файли сюди
        </label>
      ) : null}
      {fileErrors.length > 0 ? (
        <ul className="space-y-1 text-sm text-destructive">
          {fileErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {photos.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-md border border-border bg-surface">
              <img src={photo.previewUrl} alt="" className="h-36 w-full object-cover" data-photo-local-preview />
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <span className="min-w-0 truncate text-xs">{photo.file.name}</span>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Перемістити вище"
                    disabled={index === 0}
                    onClick={() => move(photo.id, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Перемістити нижче"
                    disabled={index === photos.length - 1}
                    onClick={() => move(photo.id, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Видалити фото"
                    onClick={() => remove(photo.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              {photo.error ? (
                <p className={cn('px-2 pb-2 text-xs text-destructive')}>{photo.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
