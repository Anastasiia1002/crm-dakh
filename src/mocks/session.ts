const STORAGE_KEY = 'dakh.admin.user'

let actorId: string | null = null

export function readStoredUserId() {
  return window.localStorage.getItem(STORAGE_KEY)
}

export function setActor(userId: string | null) {
  actorId = userId
  if (userId) window.localStorage.setItem(STORAGE_KEY, userId)
  else window.localStorage.removeItem(STORAGE_KEY)
}

export function getActorId() {
  return actorId ?? readStoredUserId() ?? 'usr_anastasiia'
}
