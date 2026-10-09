import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import {
  useChangeAdminPassword,
  useCreateAdminUser,
  useRevokeAdminSessions,
  useUpdateAdminUser,
  useUsers,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { userRoleLabel } from '@/lib/labels'
import {
  canAccessUsersManagement,
  canChangeAdminRoleOrActive,
  canCreateAdminUsers,
  canManageAdminAccount,
} from '@/lib/roles'
import { getAdminUser } from '@/api/users'
import type { AdminUser, UserRole } from '@/types'

const PAGE_SIZE = 20
const ALL_ROLES = ['owner', 'admin', 'manager', 'receptionist'] as const

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Вкажіть імʼя').max(100, 'Імʼя задовге'),
  lastName: z.string().trim().min(1, 'Вкажіть прізвище').max(100, 'Прізвище задовге'),
  email: z.string().trim().email('Вкажіть коректну електронну пошту').max(320, 'Електронна пошта задовга'),
  role: z.enum(ALL_ROLES),
  active: z.enum(['yes', 'no']),
})

const createSchema = profileSchema.extend({
  password: z
    .string()
    .min(10, 'Пароль має містити щонайменше 10 символів')
    .max(128, 'Пароль задовгий'),
})

const passwordSchema = z.object({
  password: z
    .string()
    .min(10, 'Пароль має містити щонайменше 10 символів')
    .max(128, 'Пароль задовгий'),
  confirmPassword: z.string().min(1, 'Підтвердіть пароль'),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Паролі не збігаються' })
  }
})

export function UsersPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canAccess = canAccessUsersManagement(user?.role)
  const canCreate = canCreateAdminUsers(user?.role)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null)
  const [revokeUser, setRevokeUser] = useState<AdminUser | null>(null)
  const [revokeSessions, setRevokeSessions] = useState<number | null>(null)
  const [revokePending, setRevokePending] = useState(false)
  const users = useUsers({ page, limit: PAGE_SIZE })
  const revoke = useRevokeAdminSessions()

  if (!canAccess) {
    return (
      <div className="max-w-xl space-y-3 border-t border-border py-10">
        <h2 className="font-serif text-[1.7rem] font-medium">Немає доступу</h2>
        <p className="text-sm text-muted-foreground">
          Керування користувачами доступне лише власнику та адміністратору.
        </p>
      </div>
    )
  }

  if (users.isLoading && !users.data) return <LoadingState />

  if (users.isError) {
    return (
      <div className="space-y-3 border-t border-border py-10">
        <p className="text-sm">Не вдалося завантажити користувачів</p>
        <Button size="sm" variant="outline" onClick={() => void users.refetch()}>
          Спробувати ще раз
        </Button>
      </div>
    )
  }

  const items = users.data?.items ?? []
  const pagination = users.data?.pagination

  async function openRevoke(item: AdminUser) {
    if (!canManageAdminAccount(user?.role, item)) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setRevokeUser(item)
    setRevokeSessions(null)
    try {
      const details = await getAdminUser(item.id)
      setRevokeSessions(details.activeSessionCount)
    } catch {
      // Confirmation still works without the session count.
    }
  }

  function openEdit(item: AdminUser) {
    if (!canManageAdminAccount(user?.role, item)) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setEditing(item)
  }

  function openPassword(item: AdminUser) {
    if (!canManageAdminAccount(user?.role, item)) {
      toast.error('Недостатньо прав для цієї дії')
      return
    }
    setPasswordUser(item)
  }

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading
          title="Адміністратори"
          action={canCreate ? <Button onClick={() => setEditing('new')}>Додати користувача</Button> : undefined}
        />
        {items.length === 0 ? (
          <EmptyState>Користувачів поки немає.</EmptyState>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Імʼя</TableHead>
                  <TableHead>Пошта</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Стан</TableHead>
                  <TableHead>Останній вхід</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.firstName} {item.lastName}
                    </TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{userRoleLabel[item.role]}</TableCell>
                    <TableCell>
                      <Badge tone={item.active ? 'success' : 'neutral'}>
                        {item.active ? 'Активний' : 'Вимкнений'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageAdminAccount(user?.role, item) ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            Редагувати
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openPassword(item)}>
                            Пароль
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              void openRevoke(item)
                            }}
                          >
                            Сесії
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Лише перегляд</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination ? (
              <Pagination
                page={pagination.page}
                pageSize={pagination.limit}
                total={pagination.total}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </section>

      <section className="border-t border-border pt-8">
        <SectionHeading title="Журнал дій" />
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Журнал дій буде доступний після підключення audit API. Демонстраційні записи з мок-даних тут не
          показуються.
        </p>
      </section>

      <UserDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        mode={editing === 'new' ? 'create' : 'edit'}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <PasswordDialog
        open={passwordUser !== null}
        user={passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
      />

      <ConfirmDialog
        open={revokeUser !== null}
        title="Завершити сесії"
        description={
          revokeUser
            ? [
                `Завершити всі активні сесії користувача ${revokeUser.firstName} ${revokeUser.lastName}?`,
                revokeSessions !== null ? `Зараз активних сесій: ${revokeSessions}.` : null,
                user?.id === revokeUser.id ? 'Вашу поточну сесію також буде завершено, і потрібно увійти знову.' : null,
              ]
                .filter(Boolean)
                .join(' ')
            : ''
        }
        confirmLabel="Завершити сесії"
        destructive
        pending={revokePending || revoke.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeUser(null)
            setRevokeSessions(null)
          }
        }}
        onConfirm={() => {
          if (!revokeUser) return
          if (!canManageAdminAccount(user?.role, revokeUser)) {
            toast.error('Недостатньо прав для цієї дії')
            setRevokeUser(null)
            setRevokeSessions(null)
            return
          }
          const signingOutSelf = user?.id === revokeUser.id
          setRevokePending(true)
          void revoke
            .mutateAsync(revokeUser.id)
            .then(async () => {
              setRevokeUser(null)
              setRevokeSessions(null)
              if (signingOutSelf) {
                toast.success('Сесії завершено. Увійдіть знову.')
                await logout()
                navigate('/login', { replace: true })
                return
              }
              toast.success('Сесії завершено')
            })
            .catch((error) => toast.error(userErrorMessage(error)))
            .finally(() => setRevokePending(false))
        }}
      />
    </div>
  )
}

function UserDialog({
  open,
  item,
  mode,
  onOpenChange,
}: {
  open: boolean
  item?: AdminUser
  mode: 'create' | 'edit'
  onOpenChange: (open: boolean) => void
}) {
  if (mode === 'create') return <CreateUserDialog open={open} onOpenChange={onOpenChange} />
  if (!item) return null
  return <EditUserDialog open={open} item={item} onOpenChange={onOpenChange} />
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const create = useCreateAdminUser()
  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    values: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'receptionist',
      active: 'yes',
      password: '',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новий користувач</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canCreateAdminUsers(user?.role)) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              await create.mutateAsync({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                role: values.role,
                password: values.password,
              })
              toast.success('Користувача створено')
              onOpenChange(false)
            } catch (error) {
              notifyUserError(error, (field, message) => {
                if (field in values) form.setError(field as keyof typeof values, { message })
              })
            }
          })}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Імʼя" error={form.formState.errors.firstName?.message}>
              <Input {...form.register('firstName')} />
            </Field>
            <Field label="Прізвище" error={form.formState.errors.lastName?.message}>
              <Input {...form.register('lastName')} />
            </Field>
          </div>
          <Field label="Електронна пошта" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="off" {...form.register('email')} />
          </Field>
          <Field label="Роль">
            <Select value={form.watch('role')} onValueChange={(value: UserRole) => form.setValue('role', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {userRoleLabel[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Пароль" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item: AdminUser
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const update = useUpdateAdminUser()
  const canManageRole = canChangeAdminRoleOrActive(user?.role)
  const canManage = canManageAdminAccount(user?.role, item)
  const isSelf = Boolean(user && item.id === user.id)
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      role: item.role,
      active: item.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редагувати користувача</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canManage) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              const patch: {
                firstName?: string
                lastName?: string
                email?: string
                role?: UserRole
                active?: boolean
              } = {}
              if (values.firstName !== item.firstName) patch.firstName = values.firstName
              if (values.lastName !== item.lastName) patch.lastName = values.lastName
              if (values.email.trim().toLowerCase() !== item.email) patch.email = values.email
              if (canManageRole && values.role !== item.role) patch.role = values.role
              if (canManageRole && !isSelf) {
                const nextActive = values.active === 'yes'
                if (nextActive !== item.active) patch.active = nextActive
              }
              if (Object.keys(patch).length === 0) {
                toast.success('Збережено')
                onOpenChange(false)
                return
              }
              await update.mutateAsync({ id: item.id, input: patch })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              notifyUserError(error, (field, message) => {
                if (field in values) form.setError(field as keyof typeof values, { message })
              })
            }
          })}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Імʼя" error={form.formState.errors.firstName?.message}>
              <Input disabled={!canManage} {...form.register('firstName')} />
            </Field>
            <Field label="Прізвище" error={form.formState.errors.lastName?.message}>
              <Input disabled={!canManage} {...form.register('lastName')} />
            </Field>
          </div>
          <Field label="Електронна пошта" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="off" disabled={!canManage} {...form.register('email')} />
          </Field>
          <Field label="Роль">
            <Select
              value={form.watch('role')}
              onValueChange={(value: UserRole) => form.setValue('role', value)}
              disabled={!canManageRole}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {userRoleLabel[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Стан">
            <Select
              value={form.watch('active')}
              onValueChange={(value: 'yes' | 'no') => form.setValue('active', value)}
              disabled={!canManageRole || isSelf}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Активний</SelectItem>
                <SelectItem value="no">Вимкнений</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canManage || update.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PasswordDialog({
  open,
  user,
  onOpenChange,
}: {
  open: boolean
  user: AdminUser | null
  onOpenChange: (open: boolean) => void
}) {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const changePassword = useChangeAdminPassword()
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    values: { password: '', confirmPassword: '' },
  })
  const isSelf = Boolean(user && currentUser && user.id === currentUser.id)
  const canManage = user ? canManageAdminAccount(currentUser?.role, user) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Змінити пароль</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!user) return
            if (!canManageAdminAccount(currentUser?.role, user)) {
              toast.error('Недостатньо прав для цієї дії')
              return
            }
            try {
              await changePassword.mutateAsync({ id: user.id, password: values.password })
              form.reset({ password: '', confirmPassword: '' })
              onOpenChange(false)
              if (isSelf) {
                toast.success('Пароль оновлено. Увійдіть знову.')
                await logout()
                navigate('/login', { replace: true })
                return
              }
              toast.success('Пароль оновлено. Активні сесії користувача завершено.')
            } catch (error) {
              notifyUserError(error, (field, message) => {
                if (field === 'password') form.setError('password', { message })
              })
            }
          })}
        >
          <p className="text-sm text-muted-foreground">
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </p>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Після зміни власного пароля всі сесії буде завершено, і потрібно увійти знову.
            </p>
          ) : null}
          <Field label="Новий пароль" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" disabled={!canManage} {...form.register('password')} />
          </Field>
          <Field label="Підтвердження" error={form.formState.errors.confirmPassword?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              disabled={!canManage}
              {...form.register('confirmPassword')}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!canManage || changePassword.isPending}>
              Зберегти пароль
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function notifyUserError(error: unknown, setField: (field: string, message: string) => void) {
  toast.error(userErrorMessage(error))
  if (!(error instanceof ApiError) || !error.details?.length) return
  for (const detail of error.details) {
    const separator = detail.indexOf(':')
    if (separator > 0) setField(detail.slice(0, separator).trim(), detail.slice(separator + 1).trim() || detail)
  }
}

function userErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return errorMessage(error)
  if (error.status === 403) {
    if (error.code === 'SELF_DEACTIVATION') return 'Не можна деактивувати власний обліковий запис'
    return 'Недостатньо прав для цієї дії'
  }
  if (error.status === 404) return error.message || 'Користувача не знайдено'
  if (error.status === 409) {
    if (error.code === 'EMAIL_ALREADY_EXISTS') return 'Користувач з такою поштою вже існує'
    if (error.code === 'LAST_SUPER_ADMIN') {
      return 'У системі має залишитися хоча б один активний суперадміністратор'
    }
    return error.message
  }
  if (error.details?.length) return error.details.join('. ')
  return error.message || 'Не вдалося виконати дію'
}
