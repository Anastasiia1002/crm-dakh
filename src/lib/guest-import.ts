import { ApiError } from '@/lib/api-error'
import { canImportGuests } from '@/lib/roles'
import type { UserRole } from '@/types'

export const GUEST_IMPORT_MAX_BYTES = 1 * 1024 * 1024
export const GUEST_IMPORT_UPDATE_CONFIRM_LABEL = 'Я підтверджую оновлення наявних клієнтів'
export const GUEST_IMPORT_HISTORY_TITLE = 'Імпортована історія (не бронювання у CRM)'

export const GUEST_IMPORT_STEPS = [
  'upload',
  'preview',
  'map',
  'validation',
  'duplicates',
  'confirm',
  'summary',
] as const

export type GuestImportStep = (typeof GUEST_IMPORT_STEPS)[number]

export const GUEST_IMPORT_STEP_LABEL: Record<GuestImportStep, string> = {
  upload: 'Файл',
  preview: 'Перегляд колонок',
  map: 'Відповідність полів',
  validation: 'Перевірка',
  duplicates: 'Дублікати',
  confirm: 'Підтвердження',
  summary: 'Підсумок',
}

export const GUEST_IMPORT_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'country',
  'city',
  'notes',
  'importedStayCount',
  'importedLastStayOn',
  'importedNightCount',
  'importedSpendAmount',
] as const

export type GuestImportField = (typeof GUEST_IMPORT_FIELDS)[number]

export const GUEST_IMPORT_FIELD_LABEL: Record<GuestImportField, string> = {
  firstName: 'Імʼя',
  lastName: 'Прізвище',
  email: 'Email',
  phone: 'Телефон',
  country: 'Країна',
  city: 'Місто',
  notes: 'Примітки',
  importedStayCount: 'Імпортовані бронювання',
  importedLastStayOn: 'Імпортоване останнє бронювання',
  importedNightCount: 'Імпортовані ночі',
  importedSpendAmount: 'Імпортовані витрати',
}

export type GuestImportMapping = Record<string, GuestImportField | null>
export type GuestImportDuplicateMode = 'skip' | 'update'

export type GuestImportRowIssue = {
  rowIndex: number
  code: string
  message: string
}

export type GuestImportDuplicateWarning = {
  rowIndex: number
  kind: 'email' | 'phone' | 'conflict'
  message: string
}

export type GuestImportPreview = {
  delimiter: string
  headers: string[]
  suggestedMapping: GuestImportMapping
  sampleRows: string[][]
  rowCount: number
  rowIssues: GuestImportRowIssue[]
  duplicateWarnings: GuestImportDuplicateWarning[]
}

export type GuestImportSummary = {
  created: number
  updated: number
  skipped: number
  failed: number
  rowCount: number
  errors: GuestImportRowIssue[]
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/

const HEADER_TO_FIELD: Record<string, GuestImportField> = {
  "ім'я": 'firstName',
  прізвище: 'lastName',
  email: 'email',
  телефон: 'phone',
  країна: 'country',
  місто: 'city',
  примітки: 'notes',
  бронювань: 'importedStayCount',
  'останнє бронювання': 'importedLastStayOn',
  ночей: 'importedNightCount',
  витрачено: 'importedSpendAmount',
}

export function guestImportVisible(role: UserRole | undefined) {
  return canImportGuests(role)
}

export function guestImportStepIndex(step: GuestImportStep) {
  return GUEST_IMPORT_STEPS.indexOf(step)
}

export function nextGuestImportStep(step: GuestImportStep): GuestImportStep | null {
  const index = guestImportStepIndex(step)
  return index >= 0 ? (GUEST_IMPORT_STEPS[index + 1] ?? null) : null
}

export function previousGuestImportStep(step: GuestImportStep): GuestImportStep | null {
  const index = guestImportStepIndex(step)
  return index > 0 ? (GUEST_IMPORT_STEPS[index - 1] ?? null) : null
}

export function validateGuestImportFile(file: { name: string; size: number } | null): string | null {
  if (!file) return 'Оберіть CSV-файл.'
  const name = file.name.trim()
  if (!name) return 'Оберіть CSV-файл.'
  if (!name.toLowerCase().endsWith('.csv')) return 'Потрібен файл з розширенням .csv.'
  if (file.size <= 0) return 'Файл порожній.'
  if (file.size > GUEST_IMPORT_MAX_BYTES) return 'Файл має бути не більшим за 1 МБ.'
  return null
}

export function csvHeaderLine(csv: string) {
  const text = csv.replace(/^\uFEFF/, '')
  const line = text.split(/\r?\n/)[0] ?? ''
  return line.trim()
}

export function csvHeadersFromLine(line: string) {
  return line.split(',').map((header) => header.trim()).filter((header) => header.length > 0)
}

export function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u201B\u0060\u00B4]/g, "'")
    .replace(/\s+/g, ' ')
}

export function autoMapGuestImportHeaders(headers: readonly string[]): GuestImportMapping {
  const mapping: GuestImportMapping = {}
  const used = new Set<GuestImportField>()
  for (const header of headers) {
    const field = HEADER_TO_FIELD[normalizeImportHeader(header)]
    if (field && !used.has(field)) {
      mapping[header] = field
      used.add(field)
      continue
    }
    mapping[header] = null
  }
  return mapping
}

export function isGuestImportField(value: unknown): value is GuestImportField {
  return typeof value === 'string' && GUEST_IMPORT_FIELDS.some((field) => field === value)
}

export function sanitizeGuestImportMapping(raw: unknown, headers?: readonly string[]): GuestImportMapping {
  const mapping: GuestImportMapping = {}
  if (headers) {
    for (const header of headers) mapping[header] = null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return mapping
  const used = new Set<GuestImportField>()
  for (const [header, value] of Object.entries(raw as Record<string, unknown>)) {
    if (headers && !headers.includes(header)) continue
    if (value === null || value === '' || value === undefined) {
      mapping[header] = null
      continue
    }
    if (!isGuestImportField(value) || used.has(value)) {
      mapping[header] = null
      continue
    }
    mapping[header] = value
    used.add(value)
  }
  return mapping
}

export function mappingPayload(mapping: GuestImportMapping): Record<string, GuestImportField> {
  const payload: Record<string, GuestImportField> = {}
  for (const [header, field] of Object.entries(mapping)) {
    if (field && isGuestImportField(field)) payload[header] = field
  }
  return payload
}

export function guestImportMappingReady(mapping: GuestImportMapping): string | null {
  const fields = new Set(Object.values(mapping).filter((field): field is GuestImportField => field !== null))
  if (!fields.has('firstName') || !fields.has('lastName')) {
    return 'Потрібно зіставити імʼя та прізвище.'
  }
  return null
}

export function guestImportMappingConflicts(mapping: GuestImportMapping): string | null {
  const seen = new Set<GuestImportField>()
  for (const field of Object.values(mapping)) {
    if (!field) continue
    if (seen.has(field)) return 'Кожне поле можна зіставити лише з однією колонкою.'
    seen.add(field)
  }
  return null
}

export function formatGuestImportIssue(issue: GuestImportRowIssue) {
  return `Рядок ${issue.rowIndex}: ${issue.message}`
}

export function guestImportValidationModel(issues: readonly GuestImportRowIssue[]) {
  return {
    hasErrors: issues.length > 0,
    title: issues.length > 0 ? 'Знайдено помилки в рядках' : 'Помилок не знайдено.',
    items: issues.map((issue) => ({
      rowIndex: issue.rowIndex,
      code: issue.code,
      label: formatGuestImportIssue(issue),
      message: issue.message,
    })),
  }
}

export function guestImportCommitReady(input: {
  duplicateMode: GuestImportDuplicateMode
  updateConfirmed: boolean
}): { ok: true } | { ok: false; error: string } {
  if (input.duplicateMode !== 'skip' && input.duplicateMode !== 'update') {
    return { ok: false, error: 'Оберіть, що робити з дублікатами.' }
  }
  if (input.duplicateMode === 'update' && !input.updateConfirmed) {
    return { ok: false, error: 'Щоб оновити наявних клієнтів, підтвердіть це окремо.' }
  }
  return { ok: true }
}

export function parseGuestImportPreview(raw: unknown): GuestImportPreview {
  const record = objectOf(raw, 'guest import preview')
  const headers = stringArray(record.headers, 'preview headers')
  const suggested =
    record.suggestedMapping === undefined
      ? autoMapGuestImportHeaders(headers)
      : sanitizeGuestImportMapping(record.suggestedMapping, headers)
  return {
    delimiter: delimiterOf(record.delimiter),
    headers,
    suggestedMapping: suggested,
    sampleRows: sampleRowsOf(record.sampleRows),
    rowCount: countOf(record.rowCount, 'preview row count'),
    rowIssues: issuesOf(record.rowIssues),
    duplicateWarnings: warningsOf(record.duplicateWarnings),
  }
}

export function parseGuestImportCommitResult(raw: unknown): GuestImportSummary {
  const record = objectOf(raw, 'guest import result')
  const summary = record.summary && typeof record.summary === 'object' && !Array.isArray(record.summary)
    ? (record.summary as Record<string, unknown>)
    : record
  return {
    created: countOf(summary.created, 'created'),
    updated: countOf(summary.updated, 'updated'),
    skipped: countOf(summary.skipped, 'skipped'),
    failed: countOf(summary.failed, 'failed'),
    rowCount: countOf(summary.rowCount ?? record.rowCount, 'row count'),
    errors: issuesOf(record.errors ?? summary.errors),
  }
}

/** Formula-safe cell, matching backend spreadsheetCell. */
export function spreadsheetCell(value: string) {
  const trimmed = value.replaceAll('\0', '')
  if (FORMULA_PREFIX.test(trimmed)) return `'${trimmed}`
  return trimmed
}

export function csvEscapeImportCell(value: string) {
  const safe = spreadsheetCell(value)
  if (/[",\n\r;]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`
  return safe
}

export function buildGuestImportErrorCsv(errors: readonly GuestImportRowIssue[]) {
  const rows: string[][] = [
    ['Рядок', 'Код', 'Помилка'].map(spreadsheetCell),
    ...errors.map((issue) => [
      spreadsheetCell(String(issue.rowIndex)),
      spreadsheetCell(issue.code),
      spreadsheetCell(issue.message),
    ]),
  ]
  return `\uFEFF${rows.map((row) => row.map(csvEscapeImportCell).join(',')).join('\r\n')}`
}

export function downloadGuestImportErrorCsv(errors: readonly GuestImportRowIssue[]) {
  const csv = buildGuestImportErrorCsv(errors)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'pomylky-importu.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function objectOf(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(`Некоректна відповідь імпорту (${label}).`, 0, 'GUEST_IMPORT_INVALID')
  }
  return value as Record<string, unknown>
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ApiError(`Некоректна відповідь імпорту (${label}).`, 0, 'GUEST_IMPORT_INVALID')
  }
  return value
}

function sampleRowsOf(value: unknown): string[][] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new ApiError('Некоректна відповідь імпорту (sample rows).', 0, 'GUEST_IMPORT_INVALID')
  }
  return value.slice(0, 20).map((row) => {
    if (!Array.isArray(row) || row.some((cell) => typeof cell !== 'string')) {
      throw new ApiError('Некоректна відповідь імпорту (sample rows).', 0, 'GUEST_IMPORT_INVALID')
    }
    return row as string[]
  })
}

function issuesOf(value: unknown): GuestImportRowIssue[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new ApiError('Некоректна відповідь імпорту (errors).', 0, 'GUEST_IMPORT_INVALID')
  }
  return value.map((item) => {
    const row = objectOf(item, 'import issue')
    const rowIndex = row.rowIndex ?? row.index ?? row.row
    if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex) || rowIndex < 0) {
      throw new ApiError('Некоректна відповідь імпорту (row index).', 0, 'GUEST_IMPORT_INVALID')
    }
    if (typeof row.message !== 'string' || row.message.trim().length === 0) {
      throw new ApiError('Некоректна відповідь імпорту (message).', 0, 'GUEST_IMPORT_INVALID')
    }
    const code = typeof row.code === 'string' && row.code.trim() ? row.code : 'ROW_INVALID'
    return { rowIndex, code, message: row.message }
  })
}

function warningsOf(value: unknown): GuestImportDuplicateWarning[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new ApiError('Некоректна відповідь імпорту (duplicates).', 0, 'GUEST_IMPORT_INVALID')
  }
  return value.map((item) => {
    const row = objectOf(item, 'duplicate warning')
    const rowIndex = row.rowIndex ?? row.index ?? row.row
    if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex) || rowIndex < 0) {
      throw new ApiError('Некоректна відповідь імпорту (duplicate row).', 0, 'GUEST_IMPORT_INVALID')
    }
    const kind = row.kind === 'phone' || row.kind === 'conflict' ? row.kind : 'email'
    const message =
      typeof row.message === 'string' && row.message.trim()
        ? row.message
        : kind === 'phone'
          ? 'Можливий дублікат за телефоном.'
          : kind === 'conflict'
            ? 'Конфлікт ідентифікаторів.'
            : 'Можливий дублікат за email.'
    return { rowIndex, kind, message }
  })
}

function delimiterOf(value: unknown) {
  if (value === ';' || value === ',') return value
  if (value === undefined) return ','
  throw new ApiError('Некоректна відповідь імпорту (delimiter).', 0, 'GUEST_IMPORT_INVALID')
}

function countOf(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ApiError(`Некоректна відповідь імпорту (${label}).`, 0, 'GUEST_IMPORT_INVALID')
  }
  return value
}
