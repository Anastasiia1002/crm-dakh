/**
 * Guided CSV guest import helpers. Run: npx --yes tsx src/lib/guest-import.verify.ts
 */
import { readFileSync } from 'node:fs'
import {
  GUEST_IMPORT_FIELDS,
  GUEST_IMPORT_STEPS,
  GUEST_IMPORT_UPDATE_CONFIRM_LABEL,
  autoMapGuestImportHeaders,
  buildGuestImportErrorCsv,
  csvHeaderLine,
  csvHeadersFromLine,
  guestImportCommitReady,
  guestImportMappingReady,
  guestImportStepIndex,
  guestImportValidationModel,
  guestImportVisible,
  mappingPayload,
  nextGuestImportStep,
  parseGuestImportCommitResult,
  parseGuestImportPreview,
  previousGuestImportStep,
  sanitizeGuestImportMapping,
  spreadsheetCell,
  validateGuestImportFile,
} from './guest-import.js'
import { ROLE_PERMISSIONS } from './permissions.js'
import { canImportGuests } from './roles.js'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const fixture = readFileSync(new URL('./fixtures/gosti.csv', import.meta.url), 'utf8')
const headerLine = csvHeaderLine(fixture)
const headers = csvHeadersFromLine(headerLine)
const dataRows = fixture.replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1)

assert(validateGuestImportFile(null) === 'Оберіть CSV-файл.', 'missing file')
assert(validateGuestImportFile({ name: 'gosti.xls', size: 12 }) === 'Потрібен файл з розширенням .csv.', 'rejects non-csv')
assert(validateGuestImportFile({ name: 'gosti.csv', size: 0 }) === 'Файл порожній.', 'rejects empty csv')
assert(validateGuestImportFile({ name: 'gosti.csv', size: 2 * 1024 * 1024 }) === 'Файл має бути не більшим за 1 МБ.', 'rejects oversized csv')
assert(validateGuestImportFile({ name: 'gosti.csv', size: 120 }) === null, 'accepts csv')

assert(headers[0] && autoMapGuestImportHeaders(headers)[headers[0]] === 'firstName', 'maps Імʼя from fixture')
assert(autoMapGuestImportHeaders(headers)['Прізвище'] === 'lastName', 'maps last name')
assert(autoMapGuestImportHeaders(headers).Email === 'email', 'maps email')
assert(autoMapGuestImportHeaders(headers)['Телефон'] === 'phone', 'maps phone')
assert(autoMapGuestImportHeaders(headers)['Країна'] === 'country', 'maps country')
assert(autoMapGuestImportHeaders(headers)['Місто'] === 'city', 'maps city')
assert(autoMapGuestImportHeaders(headers)['Примітки'] === 'notes', 'maps notes')
assert(autoMapGuestImportHeaders(headers)['Бронювань'] === 'importedStayCount', 'maps imported stays')
assert(autoMapGuestImportHeaders(headers)['Останнє бронювання'] === 'importedLastStayOn', 'maps imported last stay')
assert(autoMapGuestImportHeaders(headers)['Ночей'] === 'importedNightCount', 'maps imported nights')
assert(autoMapGuestImportHeaders(headers)['Витрачено'] === 'importedSpendAmount', 'maps imported spend')
assert(autoMapGuestImportHeaders(["Ім'я"])["Ім'я"] === 'firstName', 'maps ASCII apostrophe variant')
assert(dataRows.length === 17, 'fixture has 17 guests')

const preview = parseGuestImportPreview({
  delimiter: ',',
  headers,
  suggestedMapping: autoMapGuestImportHeaders(headers),
  sampleRows: [['Тест', 'Перший', 'guest01@example.test']],
  rowCount: 17,
  rowIssues: [{ rowIndex: 16, code: 'EMAIL_REQUIRED', message: 'Немає email і телефону.' }],
  duplicateWarnings: [{ rowIndex: 2, kind: 'email', message: 'Email уже є в цьому готелі.' }],
})
assert(preview.headers.length === 11 && preview.suggestedMapping['Прізвище'] === 'lastName', 'preview keeps suggested mapping')
assert(preview.rowCount === 17 && preview.sampleRows[0]?.[0] === 'Тест', 'preview sample rows stay on the uploaded file')
assert(guestImportMappingReady(preview.suggestedMapping) === null, 'fixture headers map required identity fields')
assert(
  sanitizeGuestImportMapping({ Прізвище: 'lastName', secret: 'passwordHash', Email: 'hotelId' }, headers).secret === undefined,
  'mapping whitelist drops unknown fields',
)
assert(sanitizeGuestImportMapping({ Прізвище: 'lastName', Email: 'notes' }, ['Прізвище', 'Email']).Email === 'notes', 'manual remap stays on whitelist')
assert(!('hotelId' in mappingPayload({ Прізвище: 'lastName', extra: null })), 'payload omits unmapped columns')

const validation = guestImportValidationModel(preview.rowIssues)
assert(validation.hasErrors && validation.items[0]?.label.includes('Рядок 16'), 'validation errors are displayable')
assert(guestImportValidationModel([]).title === 'Помилок не знайдено.', 'empty issues are a clean validation step')

assert(guestImportCommitReady({ duplicateMode: 'skip', updateConfirmed: false }).ok, 'skip does not need extra confirmation')
assert(!guestImportCommitReady({ duplicateMode: 'update', updateConfirmed: false }).ok, 'update requires confirmation')
assert(guestImportCommitReady({ duplicateMode: 'update', updateConfirmed: true }).ok, 'update proceeds after checkbox')

const summary = parseGuestImportCommitResult({
  created: 14,
  updated: 0,
  skipped: 2,
  failed: 1,
  rowCount: 17,
  errors: [{ rowIndex: 16, code: 'EMAIL_REQUIRED', message: 'Немає email і телефону.' }],
})
assert(summary.created === 14 && summary.skipped === 2 && summary.failed === 1, 'commit summary counts')
assert(summary.errors.length === 1 && summary.errors[0]?.rowIndex === 16, 'error report stays on failed rows')

const csv = buildGuestImportErrorCsv(summary.errors)
assert(csv.startsWith('\uFEFF'), 'error csv has a BOM')
assert(csv.includes('Рядок') && csv.includes('16') && csv.includes('Немає email і телефону.'), 'error csv has the failed row')
assert(!csv.includes('Тест') && !csv.includes('Перший') && !csv.includes('gosti.csv'), 'error csv does not add unrelated guests')
assert(spreadsheetCell('=CMD') === "'=CMD" && spreadsheetCell('+1') === "'+1", 'error cells are formula-safe')
assert(csv.includes("'=CMD") === false, 'this report has no formula cells unless present in the error')
assert(buildGuestImportErrorCsv([{ rowIndex: 1, code: 'X', message: '=CMD()' }]).includes("'=CMD()"), 'leading apostrophe on formula errors')

assert(GUEST_IMPORT_STEPS.length === 7 && guestImportStepIndex('upload') === 0, 'seven guided steps')
assert(nextGuestImportStep('upload') === 'preview' && previousGuestImportStep('summary') === 'confirm', 'step machine')
assert(nextGuestImportStep('summary') === null && previousGuestImportStep('upload') === null, 'ends of the wizard')

assert(guestImportVisible('owner') && guestImportVisible('admin'), 'import is visible to owner and admin')
assert(!guestImportVisible('manager') && !guestImportVisible('receptionist'), 'import is hidden from desk roles')
assert(canImportGuests('owner') && canImportGuests('admin'), 'canImportGuests matches owner and admin')
assert(!canImportGuests('manager') && !canImportGuests('receptionist'), 'canImportGuests denies desk roles')
assert(ROLE_PERMISSIONS.owner.includes('guests.import') && ROLE_PERMISSIONS.admin.includes('guests.import'), 'admin keeps guests.import')
assert(!ROLE_PERMISSIONS.admin.includes('guests.export'), 'admin still does not export')
assert(!ROLE_PERMISSIONS.manager.includes('guests.import') && !ROLE_PERMISSIONS.receptionist.includes('guests.import'), 'import is not a staff operation')

const dialog = readFileSync(new URL('../components/guests/GuestImportDialog.tsx', import.meta.url), 'utf8')
assert(dialog.includes('accept=".csv"'), 'wizard accepts csv')
assert(dialog.includes('Підтвердити імпорт'), 'confirm step is in the wizard')
assert(dialog.includes(GUEST_IMPORT_UPDATE_CONFIRM_LABEL), 'update requires an extra checkbox')
assert(dialog.includes('Завантажити звіт про помилки'), 'summary can download the error report')
assert(!dialog.includes('Імпорт недоступний'), 'stub copy is gone')
assert(!dialog.includes('gosti.csv'), 'wizard does not hard-code the fixture')

const directory = readFileSync(new URL('../pages/guests/GuestsPage.tsx', import.meta.url), 'utf8')
assert(directory.includes('canImport') && directory.includes('Імпорт'), 'GuestsPage shows Import only when allowed')
assert(directory.includes('GuestImportDialog'), 'GuestsPage mounts the wizard')

const api = readFileSync(new URL('../api/guests.ts', import.meta.url), 'utf8')
assert(api.includes('authorizedFormUpload'), 'API client reuses multipart upload')
assert(api.includes('guestImportPreviewPath') && api.includes('guestImportCommitPath'), 'import paths live in the mapper')
assert(api.includes("append('confirm', 'true')"), 'commit sends confirm=true')
assert(api.includes("append('duplicateMode'"), 'commit sends duplicateMode')
assert(!api.includes('https://'), 'import helpers do not call a live host')

console.log('PASS: guided CSV guest import helpers')
