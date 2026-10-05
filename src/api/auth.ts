import { ApiError, delay } from '@/mocks/delay'
import * as db from '@/mocks/db'
import { getActorId, readStoredUserId, setActor } from '@/mocks/session'
import type { AdminUser } from '@/types'

export async function login(email: string, password: string): Promise<AdminUser> {
  await delay()
  const normalized = email.trim().toLowerCase()
  const user = db.users.find((item) => item.email.toLowerCase() === normalized && item.active)
  if (!user || db.passwords[user.email] !== password) {
    throw new ApiError('Невірна електронна пошта або пароль')
  }
  setActor(user.id)
  return structuredClone(user)
}

export async function restoreSession(): Promise<AdminUser | null> {
  await delay(40)
  const stored = readStoredUserId()
  if (!stored) return null
  const user = db.users.find((item) => item.id === stored && item.active)
  if (!user) {
    setActor(null)
    return null
  }
  setActor(user.id)
  return structuredClone(user)
}

export async function logout() {
  await delay(40)
  setActor(null)
}

export function currentUser(): AdminUser | undefined {
  return db.users.find((item) => item.id === getActorId())
}
