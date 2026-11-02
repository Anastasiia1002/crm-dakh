import { ImageOff, Star } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  useAdminRoomTypeImages,
  useDeleteAdminRoomTypeImage,
  useReorderAdminRoomTypeImages,
  useUpdateAdminRoomTypeImage,
} from '@/hooks/useHotel'
import {
  ACCOMMODATION_UPLOAD_BLOCKED,
  accommodationErrorMessage,
  accommodationImageRejection,
  isSafeAccommodationImageUrl,
  makeImageMain,
  moveImage,
  sortRoomTypeImages,
  validateAccommodationImageFile,
} from '@/lib/accommodation-editor'
import { cn } from '@/lib/utils'
import type { RoomTypeImage } from '@/types'

const imageSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Вкажіть коректну URL-адресу')
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'Має бути http або https адреса',
    }),
  alt: z.string().max(300, 'Alt задовгий'),
})

export function AccommodationPhotoGallery({
  roomTypeId,
  canWrite,
}: {
  roomTypeId: string
  canWrite: boolean
}) {
  const images = useAdminRoomTypeImages(roomTypeId)
  const update = useUpdateAdminRoomTypeImage()
  const reorder = useReorderAdminRoomTypeImages()
  const remove = useDeleteAdminRoomTypeImage()
  const [pendingDelete, setPendingDelete] = useState<RoomTypeImage | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({})
  const [dragging, setDragging] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [blockedFiles, setBlockedFiles] = useState<string[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const replaceForm = useForm<z.infer<typeof imageSchema>>({
    resolver: zodResolver(imageSchema),
    defaultValues: { url: '', alt: '' },
  })

  const items = useMemo(() => sortRoomTypeImages(images.data ?? []), [images.data])

  function reviewFiles(list: FileList | File[]) {
    const rejected: string[] = []
    const blocked: string[] = []
    for (const file of Array.from(list)) {
      const result = validateAccommodationImageFile(file)
      if (!result.ok) {
        rejected.push(accommodationImageRejection(result.reason, file.name))
        continue
      }
      blocked.push(file.name.trim() || 'Файл')
    }
    setFileErrors(rejected)
    setBlockedFiles(blocked)
  }

  async function persistOrder(imageIds: string[]) {
    if (!canWrite) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setBusyId('order')
    try {
      await reorder.mutateAsync({ roomTypeId, imageIds })
      toast.success('Порядок фото оновлено')
    } catch (error) {
      toast.error(accommodationErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  function onCardDrop(targetId: string, event: DragEvent<HTMLElement>) {
    event.preventDefault()
    if (event.dataTransfer.files.length > 0) return
    const sourceId = event.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return
    const ids = items.map((item) => item.id)
    const from = ids.indexOf(sourceId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    void persistOrder(next)
  }

  return (
    <div className="space-y-4" data-photo-gallery>
      <div>
        <h2 className="font-serif text-2xl font-medium">Фото</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Перше фото є головним на сайті. Зовнішні посилання лишаються як є. Видалення прибирає лише запис у цьому
          розміщенні, файл за посиланням не видаляється.
        </p>
      </div>

      {images.isLoading ? (
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3" data-photo-loading>
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="aspect-[4/3] animate-pulse bg-muted" />
        </div>
      ) : null}

      {images.isError ? (
        <div className="space-y-2 border border-border p-4">
          <p className="text-sm">Не вдалося завантажити фото</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void images.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {!images.isLoading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Фото ще немає.</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
          {items.map((image, index) => {
            const safe = isSafeAccommodationImageUrl(image.url)
            const broken = !safe || brokenIds[image.id]
            const replacing = replacingId === image.id
            return (
              <li
                key={image.id}
                data-photo-card
                data-photo-main={index === 0 ? 'true' : 'false'}
                draggable={canWrite}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', image.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(event) => {
                  if (Array.from(event.dataTransfer.types).includes('Files')) return
                  event.preventDefault()
                }}
                onDrop={(event) => onCardDrop(image.id, event)}
                className="flex min-w-0 flex-col border border-border bg-card"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {broken ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-sm text-muted-foreground">
                      <ImageOff className="size-5" aria-hidden />
                      {safe ? 'Фото не завантажилось' : 'Некоректне посилання'}
                    </div>
                  ) : (
                    <img
                      src={image.url}
                      alt={image.alt ?? ''}
                      className="h-full w-full object-cover"
                      onError={() => setBrokenIds((current) => ({ ...current, [image.id]: true }))}
                    />
                  )}
                  {index === 0 ? (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-background px-2 py-1 text-xs">
                      <Star className="size-3" aria-hidden />
                      Головне
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <p className="text-sm">{image.alt?.trim() ? image.alt : 'Без підпису'}</p>
                  {canWrite ? (
                    <div className="mt-auto flex flex-wrap gap-2">
                      {index > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-11"
                          disabled={busyId !== null}
                          onClick={() => {
                            const next = makeImageMain(
                              items.map((item) => item.id),
                              image.id,
                            )
                            if (next) void persistOrder(next)
                          }}
                        >
                          Зробити головним
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        disabled={index === 0 || busyId !== null}
                        onClick={() => {
                          const next = moveImage(
                            items.map((item) => item.id),
                            image.id,
                            -1,
                          )
                          if (next) void persistOrder(next)
                        }}
                      >
                        Вище
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        disabled={index === items.length - 1 || busyId !== null}
                        onClick={() => {
                          const next = moveImage(
                            items.map((item) => item.id),
                            image.id,
                            1,
                          )
                          if (next) void persistOrder(next)
                        }}
                      >
                        Нижче
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => {
                          setReplacingId(replacing ? null : image.id)
                          replaceForm.reset({ url: image.url, alt: image.alt ?? '' })
                        }}
                      >
                        Замінити
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => setPendingDelete(image)}
                      >
                        Видалити
                      </Button>
                    </div>
                  ) : null}
                  {replacing ? (
                    <form
                      className="space-y-3"
                      onSubmit={replaceForm.handleSubmit(async (values) => {
                        if (!canWrite) {
                          toast.error('Недостатньо прав для цієї дії')
                          return
                        }
                        try {
                          await update.mutateAsync({
                            roomTypeId,
                            imageId: image.id,
                            input: {
                              url: values.url,
                              alt: values.alt.trim() ? values.alt.trim() : null,
                            },
                          })
                          setBrokenIds((current) => ({ ...current, [image.id]: false }))
                          setReplacingId(null)
                          toast.success('Фото оновлено')
                        } catch (error) {
                          toast.error(accommodationErrorMessage(error))
                        }
                      })}
                    >
                      <Field label="Нове посилання" error={replaceForm.formState.errors.url?.message}>
                        <Input {...replaceForm.register('url')} />
                      </Field>
                      <Field label="Підпис" error={replaceForm.formState.errors.alt?.message}>
                        <Input {...replaceForm.register('alt')} />
                      </Field>
                      <Button type="submit" size="sm" className="min-h-11" disabled={update.isPending} loading={update.isPending}>
                        Зберегти заміну
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {canWrite ? (
        <div className="space-y-4">
          <div
            data-photo-drop
            className={cn(
              'border border-dashed border-border p-4 text-sm',
              dragging && 'bg-muted',
            )}
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer.types).includes('Files')) return
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              if (!Array.from(event.dataTransfer.types).includes('Files')) return
              event.preventDefault()
              setDragging(false)
              reviewFiles(event.dataTransfer.files)
            }}
          >
            <p className="font-medium">Завантаження фото заблоковане</p>
            <p className="mt-1 text-muted-foreground">
              JPG, PNG або WebP, до 8 МБ. Можна вибрати кілька файлів, але вони не зберігаються і не з’являються в
              галереї.
            </p>
            <Input
              className="mt-3"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                if (event.target.files) reviewFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </div>
          {fileErrors.length > 0 ? (
            <ul className="space-y-1 text-sm text-destructive" data-photo-file-errors role="alert">
              {fileErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          {blockedFiles.length > 0 ? (
            <ul className="space-y-1 text-sm" data-photo-upload-blocked role="alert">
              {blockedFiles.map((name) => (
                <li key={name}>
                  {name}: {ACCOMMODATION_UPLOAD_BLOCKED}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Прибрати фото?"
        description="Посилання зникне з цього розміщення. Файл за посиланням не видаляється."
        confirmLabel="Прибрати"
        destructive
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (!pendingDelete) return
          if (!canWrite) {
            toast.error('Недостатньо прав для цієї дії')
            setPendingDelete(null)
            return
          }
          void remove
            .mutateAsync({ roomTypeId, imageId: pendingDelete.id })
            .then(() => {
              setPendingDelete(null)
              toast.success('Фото прибрано')
            })
            .catch((error) => toast.error(accommodationErrorMessage(error)))
        }}
      />
    </div>
  )
}
