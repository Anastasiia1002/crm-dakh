/**
 * Booking mutation phases, overlay copy, and uncertain-outcome rules.
 * Run: npx --yes tsx src/lib/mutation-action.verify.ts
 */
import { readFileSync } from 'node:fs'
import { ApiError } from './api-error'
import { createSubmitLock } from './booking-form'
import {
  abortDoesNotCancelServerMessage,
  classifyMutationFailure,
  createProgressCopy,
  createUncertainCopy,
  mutationOverlayCopy,
  uncertainOutcomeMessage,
} from './mutation-action'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function main() {
  const creating = createProgressCopy()
  assert(creating.title === 'Створюємо бронювання', 'create title')
  assert(creating.detail.includes('Зберігаємо дані гостя'), 'create detail')
  assert(!creating.detail.includes('%'), 'create progress is not a fake percentage')
  const uncertainCreate = createUncertainCopy()
  assert(uncertainCreate.title === 'Перевіряємо результат бронювання', 'create uncertain title')
  assert(uncertainCreate.detail.includes('могло бути створене'), 'timeout is not reported as failure')
  assert(uncertainCreate.detail.includes('Не надсилайте його повторно'), 'create uncertain forbids another post')
  assert(mutationOverlayCopy('create').title === creating.title, 'create copy')
  assert(mutationOverlayCopy('update').title.includes('Зберігаємо'), 'update copy')
  assert(mutationOverlayCopy('cancel').title.includes('Скасовуємо'), 'cancel copy')
  assert(uncertainOutcomeMessage().includes('Не вдалося підтвердити'), 'uncertain copy')
  assert(abortDoesNotCancelServerMessage().includes('не скасовує'), 'abort is not server cancel')

  assert(classifyMutationFailure('create', new ApiError('x', 409, 'ROOM_UNAVAILABLE')) === 'error', 'conflict is error')
  assert(classifyMutationFailure('create', new ApiError('x', 400, 'VALIDATION')) === 'error', 'validation is error')
  assert(classifyMutationFailure('create', new ApiError('x', 0, 'TIMEOUT')) === 'uncertain', 'timeout is uncertain')
  assert(classifyMutationFailure('update', new ApiError('x', 503)) === 'uncertain', '5xx update is uncertain')
  assert(classifyMutationFailure('cancel', new ApiError('x', 0, 'NETWORK')) === 'uncertain', 'network cancel is uncertain')
  assert(classifyMutationFailure('create', new ApiError('x', 401, 'UNAUTHORIZED')) === 'error', '401 is not auto-resubmit')

  const formPage = readFileSync(new URL('../pages/bookings/BookingFormPage.tsx', import.meta.url), 'utf8')
  const overlay = readFileSync(new URL('../components/ui/pending-overlay.tsx', import.meta.url), 'utf8')
  assert(formPage.includes("kind !== 'create'"), 'create timeout does not return the form to idle')
  assert(overlay.includes("kind !== 'create'"), 'create overlay has no stop-and-resubmit control')
  assert(overlay.includes('role="alertdialog"') && overlay.includes('motion-safe:animate-spin'), 'dialog and reduced-motion spinner')
  assert(overlay.includes('Перевірити список бронювань'), 'uncertain create can open the booking list')
  assert(!formPage.includes('Idempotency-Key'), 'create does not send an idempotency retry')

  const lock = createSubmitLock()
  assert(lock.tryBegin(), 'first submit')
  assert(!lock.tryBegin(), 'double click ignored')
  lock.end()
  assert(lock.tryBegin(), 'retry after finished')
  console.log('PASS: mutation action safety')
  console.log('All mutation action checks passed.')
}

main()
