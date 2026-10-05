import { useAuth } from '@/hooks/useAuth'
import { userRoleLabel } from '@/lib/labels'
import { initials } from '@/lib/utils'

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-5 border-b border-border pb-8">
        <span className="grid size-16 place-items-center rounded-full bg-primary font-serif text-2xl text-primary-foreground">
          {initials(user.firstName, user.lastName)}
        </span>
        <div>
          <h2 className="font-serif text-4xl font-medium">
            {user.firstName} {user.lastName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{userRoleLabel[user.role]}</p>
        </div>
      </div>
      <dl className="mt-6 text-sm">
        <div className="flex justify-between border-b border-border py-4">
          <dt className="text-muted-foreground">Електронна пошта</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between border-b border-border py-4">
          <dt className="text-muted-foreground">Роль</dt>
          <dd>{userRoleLabel[user.role]}</dd>
        </div>
      </dl>
    </div>
  )
}
