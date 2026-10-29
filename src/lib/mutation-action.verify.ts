/**
 * Booking mutation phases, overlay copy, and uncertain-outcome rules.
 * Run: npx --yes tsx src/lib/mutation-action.verify.ts
 */
import { ApiError } from './api-error'
import { createSubmitLock } from './booking-form'
import {
  abortDoesNotCancelServerMessage,
  classifyMutationFailure,
  mutationOverlayCopy,
  uncertainOutcomeMessage,
} from './mutation-action'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function main() {
  assert(mutationOverlayCopy('create').title.includes('Створюємо'), 'create copy')
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

  const lock = createSubmitLock()
  assert(lock.tryBegin(), 'first submit')
  assert(!lock.tryBegin(), 'double click ignored')
  lock.end()
  assert(lock.tryBegin(), 'retry after finished')
  console.log('PASS: mutation action safety')
  console.log('All mutation action checks passed.')
}

main()
