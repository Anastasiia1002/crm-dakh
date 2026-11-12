import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCommitGuestImport, usePreviewGuestImport } from '@/hooks/useGuestDirectory'
import { errorMessage } from '@/lib/errors'
import {
  GUEST_IMPORT_FIELD_LABEL,
  GUEST_IMPORT_FIELDS,
  GUEST_IMPORT_STEP_LABEL,
  GUEST_IMPORT_STEPS,
  downloadGuestImportErrorCsv,
  formatGuestImportIssue,
  guestImportCommitReady,
  guestImportMappingConflicts,
  guestImportMappingReady,
  guestImportValidationModel,
  nextGuestImportStep,
  previousGuestImportStep,
  sanitizeGuestImportMapping,
  validateGuestImportFile,
  type GuestImportDuplicateMode,
  type GuestImportField,
  type GuestImportMapping,
  type GuestImportPreview,
  type GuestImportStep,
  type GuestImportSummary,
} from '@/lib/guest-import'

const UNMAPPED = '__none__'

const emptyState = {
  step: 'upload' as GuestImportStep,
  file: null as File | null,
  fileError: null as string | null,
  preview: null as GuestImportPreview | null,
  mapping: {} as GuestImportMapping,
  mappingError: null as string | null,
  duplicateMode: 'skip' as GuestImportDuplicateMode,
  updateConfirmed: false,
  duplicateError: null as string | null,
  summary: null as GuestImportSummary | null,
}

export function GuestImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const previewMutation = usePreviewGuestImport()
  const commitMutation = useCommitGuestImport()
  const [state, setState] = useState(emptyState)
  const pending = previewMutation.isPending || commitMutation.isPending
  const validation = guestImportValidationModel(state.preview?.rowIssues ?? [])

  useEffect(() => {
    if (!open) setState(emptyState)
  }, [open])

  const mappedFields = useMemo(() => new Set(Object.values(state.mapping).filter(Boolean)), [state.mapping])

  function close() {
    if (pending) return
    onOpenChange(false)
  }

  async function goNext() {
    if (state.step === 'upload') {
      const error = validateGuestImportFile(state.file)
      if (error || !state.file) {
        setState((current) => ({ ...current, fileError: error ?? 'Оберіть CSV-файл.' }))
        return
      }
      try {
        const preview = await previewMutation.mutateAsync(state.file)
        setState((current) => ({
          ...current,
          fileError: null,
          preview,
          mapping: sanitizeGuestImportMapping(preview.suggestedMapping, preview.headers),
          step: 'preview',
        }))
      } catch (error) {
        toast.error(errorMessage(error))
      }
      return
    }
    if (state.step === 'map') {
      const conflict = guestImportMappingConflicts(state.mapping)
      const ready = guestImportMappingReady(state.mapping)
      const mappingError = conflict ?? ready
      if (mappingError) {
        setState((current) => ({ ...current, mappingError }))
        return
      }
    }
    if (state.step === 'duplicates') {
      const ready = guestImportCommitReady({
        duplicateMode: state.duplicateMode,
        updateConfirmed: state.updateConfirmed,
      })
      if (!ready.ok) {
        setState((current) => ({ ...current, duplicateError: ready.error }))
        return
      }
    }
    const next = nextGuestImportStep(state.step)
    if (next) setState((current) => ({ ...current, mappingError: null, duplicateError: null, step: next }))
  }

  function goBack() {
    const previous = previousGuestImportStep(state.step)
    if (previous) setState((current) => ({ ...current, step: previous }))
  }

  async function confirmImport() {
    const ready = guestImportCommitReady({
      duplicateMode: state.duplicateMode,
      updateConfirmed: state.updateConfirmed,
    })
    if (!ready.ok) {
      setState((current) => ({ ...current, duplicateError: ready.error, step: 'duplicates' }))
      return
    }
    if (!state.file) return
    try {
      const summary = await commitMutation.mutateAsync({
        file: state.file,
        mapping: state.mapping,
        duplicateMode: state.duplicateMode,
      })
      setState((current) => ({ ...current, summary, step: 'summary' }))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Імпорт клієнтів</DialogTitle>
          <DialogDescription>
            CSV цього готелю. Імʼя та прізвище обовʼязкові. Історія з файлу не створює бронювання в CRM.
          </DialogDescription>
        </DialogHeader>
        <ol className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {GUEST_IMPORT_STEPS.map((step, index) => (
            <li key={step} className={state.step === step ? 'font-medium text-foreground' : undefined}>
              {index + 1}. {GUEST_IMPORT_STEP_LABEL[step]}
            </li>
          ))}
        </ol>

        {state.step === 'upload' ? (
          <Field label="CSV-файл" htmlFor="guest-import-file" error={state.fileError ?? undefined}>
            <Input
              id="guest-import-file"
              type="file"
              accept=".csv"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setState((current) => ({
                  ...current,
                  file,
                  fileError: validateGuestImportFile(file),
                  preview: null,
                  summary: null,
                }))
              }}
            />
          </Field>
        ) : null}

        {state.step === 'preview' && state.preview ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Роздільник «{state.preview.delimiter}». Рядків у файлі: {state.preview.rowCount}. Нижче — перші колонки.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {state.preview.headers.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.preview.sampleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, state.preview.headers.length)}>Немає рядків для перегляду.</TableCell>
                    </TableRow>
                  ) : (
                    state.preview.sampleRows.map((row, index) => (
                      <TableRow key={index}>
                        {state.preview!.headers.map((header, column) => (
                          <TableCell key={`${header}-${column}`}>{row[column] || '—'}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        {state.step === 'map' && state.preview ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Колонки зіставлено автоматично за українськими заголовками. Можна змінити вручну. Інші поля ігноруються.
            </p>
            {state.mappingError ? <p className="text-sm text-destructive">{state.mappingError}</p> : null}
            <div className="space-y-3">
              {state.preview.headers.map((header) => (
                <Field key={header} label={header}>
                  <Select
                    value={state.mapping[header] ?? UNMAPPED}
                    onValueChange={(value) => {
                      setState((current) => ({
                        ...current,
                        mappingError: null,
                        mapping: {
                          ...current.mapping,
                          [header]: value === UNMAPPED ? null : (value as GuestImportField),
                        },
                      }))
                    }}
                  >
                    <SelectTrigger aria-label={`Поле для ${header}`}>
                      <SelectValue placeholder="Не імпортувати" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>Не імпортувати</SelectItem>
                      {GUEST_IMPORT_FIELDS.map((field) => (
                        <SelectItem
                          key={field}
                          value={field}
                          disabled={mappedFields.has(field) && state.mapping[header] !== field}
                        >
                          {GUEST_IMPORT_FIELD_LABEL[field]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
            </div>
          </div>
        ) : null}

        {state.step === 'validation' ? (
          <div className="space-y-3">
            <p className="text-sm">{validation.title}</p>
            {validation.items.length > 0 ? (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-destructive">
                {validation.items.map((item) => (
                  <li key={`${item.rowIndex}-${item.code}`}>{item.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Можна перейти до дублікатів.</p>
            )}
          </div>
        ) : null}

        {state.step === 'duplicates' ? (
          <div className="space-y-4">
            {state.preview?.duplicateWarnings.length ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {state.preview.duplicateWarnings.map((warning) => (
                  <li key={`${warning.rowIndex}-${warning.kind}`}>
                    Рядок {warning.rowIndex}: {warning.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Попереджень про дублікати немає.</p>
            )}
            <Field label="Якщо клієнт уже є">
              <Select
                value={state.duplicateMode}
                onValueChange={(value: GuestImportDuplicateMode) =>
                  setState((current) => ({
                    ...current,
                    duplicateMode: value,
                    updateConfirmed: value === 'update' ? current.updateConfirmed : false,
                    duplicateError: null,
                  }))
                }
              >
                <SelectTrigger aria-label="Режим дублікатів">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Пропустити наявних</SelectItem>
                  <SelectItem value="update">Оновити наявних</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {state.duplicateMode === 'update' ? (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={state.updateConfirmed}
                  onCheckedChange={(value) =>
                    setState((current) => ({
                      ...current,
                      updateConfirmed: value === true,
                      duplicateError: null,
                    }))
                  }
                />
                <span>Я підтверджую оновлення наявних клієнтів</span>
              </label>
            ) : null}
            {state.duplicateError ? <p className="text-sm text-destructive">{state.duplicateError}</p> : null}
          </div>
        ) : null}

        {state.step === 'confirm' ? (
          <div className="space-y-2 text-sm">
            <p>Файл: {state.file?.name}</p>
            <p>Рядків: {state.preview?.rowCount ?? 0}</p>
            <p>
              Дублікати:{' '}
              {state.duplicateMode === 'update' ? 'оновити наявних клієнтів' : 'пропустити наявних клієнтів'}
            </p>
            {validation.hasErrors ? (
              <p className="text-destructive">Рядки з помилками не будуть імпортовані.</p>
            ) : null}
          </div>
        ) : null}

        {state.step === 'summary' && state.summary ? (
          <div className="space-y-3 text-sm">
            <p>Створено: {state.summary.created}</p>
            <p>Оновлено: {state.summary.updated}</p>
            <p>Пропущено: {state.summary.skipped}</p>
            <p>Не вдалося: {state.summary.failed}</p>
            {state.summary.errors.length > 0 ? (
              <>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-destructive">
                  {state.summary.errors.map((issue) => (
                    <li key={`${issue.rowIndex}-${issue.code}`}>{formatGuestImportIssue(issue)}</li>
                  ))}
                </ul>
                <Button type="button" variant="outline" onClick={() => downloadGuestImportErrorCsv(state.summary!.errors)}>
                  Завантажити звіт про помилки
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {state.step !== 'upload' && state.step !== 'summary' ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={pending}>
              Назад
            </Button>
          ) : null}
          {state.step === 'confirm' ? (
            <Button type="button" onClick={() => void confirmImport()} disabled={pending} loading={pending}>
              Підтвердити імпорт
            </Button>
          ) : state.step === 'summary' ? (
            <Button type="button" onClick={close}>
              Закрити
            </Button>
          ) : (
            <Button type="button" onClick={() => void goNext()} disabled={pending} loading={pending}>
              Далі
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
