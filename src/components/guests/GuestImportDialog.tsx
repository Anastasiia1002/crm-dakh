import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useImportGuests } from '@/hooks/useGuestDirectory'
import { errorMessage } from '@/lib/errors'
import { downloadGuestTemplate, formatFileSize } from '@/lib/guestExport'
import type { GuestImportResult } from '@/types'

const MAX_BYTES = 10 * 1024 * 1024

export function GuestImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const importGuests = useImportGuests()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [result, setResult] = useState<GuestImportResult | null>(null)

  function reset() {
    setFile(null)
    setFileError('')
    setResult(null)
  }

  function close(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function acceptFile(next: File | null) {
    setResult(null)
    if (!next) return
    const lower = next.name.toLowerCase()
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setFile(null)
      setFileError('Підтримуються лише CSV та XLSX')
      return
    }
    if (next.size > MAX_BYTES) {
      setFile(null)
      setFileError('Файл більший за 10 МБ')
      return
    }
    setFileError('')
    setFile(next)
  }

  async function submit() {
    if (!file) return
    try {
      const lower = file.name.toLowerCase()
      const text = lower.endsWith('.csv') ? await file.text() : null
      const imported = await importGuests.mutateAsync({ name: file.name, text })
      setResult(imported)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Імпорт гостей</DialogTitle>
          <DialogDescription>Завантажте файл зі списком гостей у форматі CSV або Excel.</DialogDescription>
        </DialogHeader>

        <label
          className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-border px-6 py-8 text-center text-sm"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            acceptFile(event.dataTransfer.files[0] ?? null)
          }}
        >
          <span>Перетягніть файл сюди</span>
          <span className="text-muted-foreground">або</span>
          <span className="underline underline-offset-4">Оберіть файл</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Підтримувані формати: CSV, XLSX. Максимальний розмір: 10 МБ</p>
          <button type="button" className="shrink-0 underline underline-offset-4 hover:text-foreground" onClick={downloadGuestTemplate}>
            Завантажити шаблон
          </button>
        </div>

        {fileError ? <p className="mt-3 text-sm text-destructive">{fileError}</p> : null}

        {file ? (
          <div className="mt-4 rounded-md border border-border px-3 py-2.5 text-sm">
            <p className="font-medium">{file.name}</p>
            <p className="text-muted-foreground">
              {formatFileSize(file.size)} · Готово до імпорту
            </p>
          </div>
        ) : null}

        {result ? <ImportResult result={result} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {result ? 'Закрити' : 'Скасувати'}
          </Button>
          {!result ? (
            <Button type="button" disabled={!file || importGuests.isPending} onClick={() => void submit()}>
              Імпортувати
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportResult({ result }: { result: GuestImportResult }) {
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
      <p className="font-medium">Імпорт завершено</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        <div className="flex justify-between gap-3">
          <dt>Всього записів</dt>
          <dd className="tabular-nums text-foreground">{result.totalRows}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Додано нових гостей</dt>
          <dd className="tabular-nums text-foreground">{result.created}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Знайдено існуючих</dt>
          <dd className="tabular-nums text-foreground">{result.existing}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Пропущено</dt>
          <dd className="tabular-nums text-foreground">{result.skipped}</dd>
        </div>
      </dl>
      {result.errors.length > 0 ? (
        <div>
          <p className="font-medium">Помилки імпорту</p>
          <ul className="mt-2 space-y-2">
            {result.errors.map((error) => (
              <li key={`${error.row}-${error.message}`}>
                <span className="text-muted-foreground">Рядок {error.row}</span>
                <span className="mt-0.5 block">{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
