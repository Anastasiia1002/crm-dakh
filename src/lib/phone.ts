/** Normalize reception phone input to E.164. Ukraine local numbers become +380… */

const E164 = /^\+[1-9]\d{7,14}$/

export type PhoneResult =
  | { ok: true; e164: string; digits: string; searchKey: string }
  | { ok: false; error: string }

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

export function normalizePhone(raw: string): PhoneResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: 'Вкажіть номер телефону.' }

  const compact = trimmed.replace(/[\s().-]/g, '')
  if (!/^(?:\+|00)?\d+$/.test(compact)) {
    return { ok: false, error: 'Номер телефону містить зайві символи.' }
  }

  let digits = compact.startsWith('+') ? compact.slice(1) : compact
  if (digits.startsWith('00')) digits = digits.slice(2)

  if (digits.startsWith('380') && digits.length === 12) {
    // already international Ukraine
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = `38${digits}`
  } else if (digits.length === 9) {
    digits = `380${digits}`
  }

  const e164 = `+${digits}`
  if (!E164.test(e164)) {
    return { ok: false, error: 'Вкажіть телефон у міжнародному форматі, наприклад +380501112233.' }
  }
  return { ok: true, e164, digits, searchKey: phoneSearchKey(e164) }
}

/** Digits to send to the admin guest search (substring match on stored phones). */
export function phoneSearchKey(e164: string) {
  const digits = digitsOnly(e164)
  if (digits.startsWith('380') && digits.length === 12) return digits.slice(3)
  return digits
}

/** True when a stored phone is the same number, ignoring formatting. */
export function phonesMatch(stored: string | null | undefined, e164: string) {
  const storedDigits = digitsOnly(stored ?? '')
  const wanted = digitsOnly(e164)
  if (!storedDigits || !wanted) return false
  if (storedDigits === wanted) return true
  const national = phoneSearchKey(`+${wanted}`)
  if (national.length < 9 || storedDigits.length < 9) return false
  return storedDigits.endsWith(national) || wanted.endsWith(storedDigits)
}
