import { ArrowDown, ArrowUp, ImageOff, RefreshCw, Star, Trash2 } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  useAdminRoomTypeImages,
  useDeleteAdminRoomTypeImage,
  useReorderAdminRoomTypeImages,
  useUpdateAdminRoomTypeImage,
  useUploadAdminRoomTypeImage,
} from '@/hooks/useHotel'
import {
  accommodationErrorMessage,
  accommodationImageRejection,
  accommodationUploadFailure,
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
  const upload = useUploadAdminRoomTypeImage()
  const update = useUpdateAdminRoomTypeImage()
  const reorder = useReorderAdminRoomTypeImages()
  const remove = useDeleteAdminRoomTypeImage()
  const [pendingDelete, setPendingDelete] = useState<RoomTypeImage | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({})
  const [dragging, setDragging] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [uploads, setUploads] = useState<{ id: string; name: string; progress: number; error: string | null; file: File }[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const replaceForm = useForm<z.infer<typeof imageSchema>>({
    resolver: zodResolver(imageSchema),
    defaultValues: { url: '', alt: '' },
  })

  const items = useMemo(() => sortRoomTypeImages(images.data ?? []), [images.data])
  const replacing = items.find((image) => image.id === replacingId) ?? null

  async function sendFile(file: File, jobId: string) {
    try {
      await upload.mutateAsync({
        roomTypeId,
        file,
        onProgress: (progress) => {
          setUploads((current) => current.map((job) => (job.id === jobId ? { ...job, progress, error: null } : job)))
        },
      })
      setUploads((current) => current.filter((job) => job.id !== jobId))
    } catch (error) {
      const message = accommodationUploadFailure(error)
      setUploads((current) => current.map((job) => (job.id === jobId ? { ...job, error: message } : job)))
    }
  }

  async function uploadFiles(list: FileList | File[]) {
    const rejected: string[] = []
    const accepted: { id: string; file: File }[] = []
    for (const file of Array.from(list)) {
      const result = validateAccommodationImageFile(file)
      if (!result.ok) {
        rejected.push(accommodationImageRejection(result.reason, file.name))
        continue
      }
      accepted.push({ id: crypto.randomUUID(), file })
    }
    setFileErrors(rejected)
    setUploads((current) => [
      ...current,
      ...accepted.map(({ id, file }) => ({ id, name: file.name.trim() || 'Фото', progress: 0, error: null, file })),
    ])
    for (const item of accepted) {
      await sendFile(item.file, item.id)
    }
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
          Перше фото є головним на сайті. Зовнішнє посилання лишається лише записом у списку. Фото, завантажене для
          цього розміщення, зберігається у сховищі й видаляється разом із записом.
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
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((image, index) => {
            const safe = isSafeAccommodationImageUrl(image.url)
            const broken = !safe || brokenIds[image.id]
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
                className="group @container relative min-w-0 overflow-hidden border border-border bg-card"
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
                    <span
                      className="absolute top-2 left-2 inline-flex size-7 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm"
                      aria-label="Головне"
                      title="Головне"
                    >
                      <Star className="size-3.5 fill-current" aria-hidden />
                    </span>
                  ) : null}
                  {canWrite ? (
                    <div
                      data-photo-toolbar
                      className="absolute top-2 right-2 grid w-max grid-cols-5 gap-0.5 rounded-md bg-background/80 p-0.5 opacity-100 backdrop-blur-sm transition-opacity @max-[12.5rem]:grid-cols-3 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={index === 0 || busyId !== null}
                        aria-label="Зробити головним"
                        title="Зробити головним"
                        onClick={() => {
                          const next = makeImageMain(
                            items.map((item) => item.id),
                            image.id,
                          )
                          if (next) void persistOrder(next)
                        }}
                      >
                        <Star className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={index === 0 || busyId !== null}
                        aria-label="Перемістити вище"
                        title="Перемістити вище"
                        onClick={() => {
                          const next = moveImage(
                            items.map((item) => item.id),
                            image.id,
                            -1,
                          )
                          if (next) void persistOrder(next)
                        }}
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={index === items.length - 1 || busyId !== null}
                        aria-label="Перемістити нижче"
                        title="Перемістити нижче"
                        onClick={() => {
                          const next = moveImage(
                            items.map((item) => item.id),
                            image.id,
                            1,
                          )
                          if (next) void persistOrder(next)
                        }}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Замінити фото"
                        title="Замінити фото"
                        onClick={() => {
                          setReplacingId(image.id)
                          replaceForm.reset({ url: image.url, alt: image.alt ?? '' })
                        }}
                      >
                        <RefreshCw className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Видалити фото"
                        title="Видалити фото"
                        onClick={() => setPendingDelete(image)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
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
              void uploadFiles(event.dataTransfer.files)
            }}
          >
            <p className="font-medium">Додати фото</p>
            <p className="mt-1 text-muted-foreground">JPG, PNG або WebP, до 50 МБ. Можна вибрати кілька.</p>
            <Input
              className="mt-3"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={upload.isPending}
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files)
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
          {uploads.length > 0 ? (
            <ul className="space-y-2 text-sm" data-photo-upload-progress>
              {uploads.map((job) => (
                <li key={job.id} className="border border-border p-3">
                  <p>{job.name}</p>
                  {job.error ? (
                    <p className="mt-1 text-destructive" role="alert">
                      {job.error}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Завантаження… {job.progress}%</p>
                  )}
                  {job.error ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 min-h-11"
                      onClick={() => void sendFile(job.file, job.id)}
                    >
                      Повторити
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={replacing !== null}
        onOpenChange={(open) => {
          if (!open) setReplacingId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Замінити фото</DialogTitle>
          </DialogHeader>
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
                    imageId: replacing.id,
                    input: {
                      url: values.url,
                      alt: values.alt.trim() ? values.alt.trim() : null,
                    },
                  })
                  setBrokenIds((current) => ({ ...current, [replacing.id]: false }))
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
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Прибрати фото?"
        description="Зовнішнє посилання лише зникне зі списку. Фото, завантажене для цього розміщення, також видаляється зі сховища."
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
