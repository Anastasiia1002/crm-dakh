import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState, LoadingState, SectionHeading } from '@/components/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AuditLogPanel } from '@/pages/audit/AuditLogPanel'
import { useAuth } from '@/hooks/useAuth'
import {
  useAdminInvitations,
  useChangeAdminPassword,
  useCreateAdminUser,
  useInviteAdminUser,
  useRevokeAdminSessions,
  useUpdateAdminUser,
  useUsers,
} from '@/hooks/useHotel'
import { ApiError } from '@/lib/api-error'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { staffInviteRoleLabel, userRoleLabel } from '@/lib/labels'
import {
  canAccessUsersManagement,
  canChangeAdminRoleOrActive,
  canCreateAdminUsers,
  canDeactivateUsers,
  canInviteAdminUsers,
  canUpdateAdminUsers,
  canInviteRole,
  canManageAdminAccount,
  canResetStaffPasswords,
  canRevokeStaffSessions,
} from '@/lib/roles'
import { inviteableFrontendRoles } from '@/lib/permissions'
import {
  AUDIT_SEARCH_KEYS,
  parseUsersPageTab,
  stripAuditSearchParams,
  USERS_PAGE_TAB_LABEL,
  usersPageTabsFor,
  type UsersPageTab,
} from '@/lib/users-page-tabs'
import { getAdminUser } from '@/api/users'
import type { AdminInvitation, AdminInvitationStatus, AdminUser, UserRole } from '@/types'

function invitationStatusLabel(status: AdminInvitationStatus) {
  if (status === 'pending') return 'Очікує'
  if (status === 'expired') return 'Прострочено'
  return 'Прийнято'
}

const PAGE_SIZE = 20
const ALL_ROLES = ['owner', 'admin', 'manager', 'receptionist'] as const

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Вкажіть імʼя').max(100, 'Імʼя задовге'),
  lastName: z.string().trim().min(1, 'Вкажіть прізвище').max(100, 'Прізвище задовге'),
  email: z.string().trim().email('Вкажіть коректну електронну пошту').max(320, 'Електронна пошта задовга'),
  role: z.enum(ALL_ROLES),
  active: z.enum(['yes', 'no']),
})

const inviteSchema = z.object({
  firstName: z.string().trim().min(1, 'Вкажіть імʼя').max(100, 'Імʼя задовге'),
  lastName: z.string().trim().min(1, 'Вкажіть прізвище').max(100, 'Прізвище задовге'),
  email: z.string().trim().email('Вкажіть коректну електронну пошту').max(320, 'Електронна пошта задовга'),
  role: z.enum(['admin', 'manager', 'receptionist']),
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
  const [searchParams, setSearchParams] = useSearchParams()
  const canAccess = canAccessUsersManagement(user?.role)
  const canCreate = canCreateAdminUsers(user?.role)
  const canInvite = canInviteAdminUsers(user?.role)
  const allowedTabs = usersPageTabsFor(user?.role)
  const tab = parseUsersPageTab(searchParams.get('tab'), allowedTabs)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  const [inviting, setInviting] = useState(false)
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null)
  const [revokeUser, setRevokeUser] = useState<AdminUser | null>(null)
  const [revokeSessions, setRevokeSessions] = useState<number | null>(null)
  const [revokePending, setRevokePending] = useState(false)
  const [resending, setResending] = useState<AdminInvitation | null>(null)
  const [inviteStatus, setInviteStatus] = useState<AdminInvitationStatus | 'all'>('all')
  const users = useUsers({ page, limit: PAGE_SIZE }, { enabled: canAccess && tab === 'users' })
  const invitations = useAdminInvitations(canAccess && tab === 'invitations')
  const revoke = useRevokeAdminSessions()
  const invite = useInviteAdminUser()

  useEffect(() => {
    if (!tab) return
    const requested = searchParams.get('tab')
    if (requested === tab && (tab === 'audit' || !AUDIT_SEARCH_KEYS.some((key) => searchParams.has(key)))) return
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    if (tab !== 'audit') stripAuditSearchParams(next)
    const current = searchParams.toString()
    const updated = next.toString()
    if (current !== updated) setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, tab])

  if (!tab) {
    return (
      <div className="max-w-xl space-y-3 border-t border-border py-10">
        <h2 className="font-serif text-[1.7rem] font-medium">Немає доступу</h2>
        <p className="text-sm text-muted-foreground">
          Керування користувачами недоступне для вашої ролі.
        </p>
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

  function onTabChange(value: string) {
    const nextTab = value as UsersPageTab
    if (!allowedTabs.includes(nextTab)) return
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    if (nextTab !== 'audit') stripAuditSearchParams(next)
    setSearchParams(next)
  }

  const invitationItems = (invitations.data ?? []).filter(
    (item) => inviteStatus === 'all' || item.status === inviteStatus,
  )

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="space-y-5">
      <PageHeader
        title="Користувачі"
        description="Ролі й запрошення цього готелю. Дії залежать від ваших прав."
      />
      <TabsList className="max-w-full overflow-x-auto">
        {allowedTabs.map((item) => (
          <TabsTrigger key={item} value={item}>
            {USERS_PAGE_TAB_LABEL[item]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="users">
      {tab === 'users' && users.isLoading && !users.data ? <LoadingState /> : null}
      {tab === 'users' && users.isError ? (
        <div className="space-y-3 py-6">
          <p className="text-sm">Не вдалося завантажити користувачів</p>
          <Button size="sm" variant="outline" onClick={() => void users.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}
      {tab === 'users' && !users.isError && !(users.isLoading && !users.data) ? (
      <section>
        <SectionHeading
          title="Адміністратори"
          action={
            canCreate ? (
              <Button variant="outline" onClick={() => setEditing('new')}>
                Додати з паролем
              </Button>
            ) : undefined
          }
        />
        {items.length === 0 ? (
          <EmptyState>Користувачів поки немає.</EmptyState>
        ) : (
          <>
            <div className="hidden md:block">
            <Table containerClassName="rounded-md border border-border bg-surface">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Імʼя</TableHead>
                  <TableHead>Пошта</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Стан</TableHead>
                  <TableHead>Останній вхід</TableHead>
                  <TableHead>
                    <span className="sr-only">Дії</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.firstName} {item.lastName}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate">{item.email}</TableCell>
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
                      <UserRowActions
                        item={item}
                        role={user?.role}
                        onEdit={() => openEdit(item)}
                        onPassword={() => openPassword(item)}
                        onRevoke={() => {
                          void openRevoke(item)
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <ul className="divide-y divide-border rounded-md border border-border bg-surface md:hidden">
              {items.map((item) => (
                <li key={item.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {item.firstName} {item.lastName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{item.email}</p>
                      <p className="mt-0.5 text-sm">{userRoleLabel[item.role]}</p>
                    </div>
                    <Badge tone={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'Активний' : 'Вимкнений'}
                    </Badge>
                  </div>
                  <UserRowActions
                    item={item}
                    role={user?.role}
                    onEdit={() => openEdit(item)}
                    onPassword={() => openPassword(item)}
                    onRevoke={() => {
                      void openRevoke(item)
                    }}
                  />
                </li>
              ))}
            </ul>
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
      ) : null}
      </TabsContent>

      <TabsContent value="invitations">
      {tab === 'invitations' ? (
      <section>
        <SectionHeading
          title="Запрошення"
          action={
            canInvite ? (
              <Button onClick={() => setInviting(true)}>Запросити співробітника</Button>
            ) : undefined
          }
        />
        {(invitations.data ?? []).length > 0 ? (
          <label className="mb-4 block max-w-xs space-y-1.5">
            <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Стан</span>
            <Select value={inviteStatus} onValueChange={(value: AdminInvitationStatus | 'all') => setInviteStatus(value)}>
              <SelectTrigger aria-label="Фільтр за станом запрошення">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі</SelectItem>
                <SelectItem value="pending">Очікує</SelectItem>
                <SelectItem value="expired">Прострочено</SelectItem>
                <SelectItem value="accepted">Прийнято</SelectItem>
              </SelectContent>
            </Select>
          </label>
        ) : null}
        {invitations.isError ? (
          <p className="text-sm">Не вдалося завантажити запрошення</p>
        ) : (invitations.data ?? []).length === 0 ? (
          <EmptyState>Активних запрошень немає.</EmptyState>
        ) : invitationItems.length === 0 ? (
          <EmptyState>Запрошень із цим станом немає.</EmptyState>
        ) : (
          <>
          <div className="hidden md:block">
          <Table containerClassName="rounded-md border border-border bg-surface">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Пошта</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Стан</TableHead>
                <TableHead>Створено</TableHead>
                <TableHead>Дійсне до</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitationItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[14rem] truncate">{item.email}</TableCell>
                  <TableCell>
                    {item.role === 'owner' ? userRoleLabel.owner : staffInviteRoleLabel[item.role]}
                  </TableCell>
                  <TableCell>
                    <Badge tone={invitationTone(item.status)}>{invitationStatusLabel(item.status)}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(item.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canInvite && item.status === 'pending' && item.role !== 'owner' && canInviteRole(user?.role, item.role) ? (
                      <Button size="sm" variant="ghost" onClick={() => setResending(item)}>
                        Надіслати знову
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface md:hidden">
            {invitationItems.map((item) => (
              <li key={item.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.role === 'owner' ? userRoleLabel.owner : staffInviteRoleLabel[item.role]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      До {formatDateTime(item.expiresAt)}
                    </p>
                  </div>
                  <Badge tone={invitationTone(item.status)}>{invitationStatusLabel(item.status)}</Badge>
                </div>
                {canInvite && item.status === 'pending' && item.role !== 'owner' && canInviteRole(user?.role, item.role) ? (
                  <Button size="sm" variant="ghost" onClick={() => setResending(item)}>
                    Надіслати знову
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          </>
        )}
      </section>
      ) : null}
      </TabsContent>

      <TabsContent value="audit">
        {tab === 'audit' ? <AuditLogPanel /> : null}
      </TabsContent>

      <InviteAdminDialog open={inviting} onOpenChange={setInviting} />

      <ConfirmDialog
        open={resending !== null}
        title="Надіслати запрошення знову?"
        description={
          resending
            ? `Надіслати нове посилання для ${resending.email} (${resending.role === 'owner' ? userRoleLabel.owner : staffInviteRoleLabel[resending.role]}). Попереднє посилання перестане діяти.`
            : ''
        }
        confirmLabel="Надіслати знову"
        pending={invite.isPending}
        onOpenChange={(open) => {
          if (!open) setResending(null)
        }}
        onConfirm={() => {
          if (!resending || resending.role === 'owner') return
          if (!canInviteAdminUsers(user?.role) || !canInviteRole(user?.role, resending.role)) {
            toast.error('Недостатньо прав для цієї дії')
            setResending(null)
            return
          }
          void invite
            .mutateAsync({
              email: resending.email,
              firstName: resending.firstName,
              lastName: resending.lastName,
              role: resending.role,
            })
            .then(() => {
              toast.success('Запрошення надіслано знову')
              setResending(null)
            })
            .catch((error) => toast.error(userErrorMessage(error)))
        }}
      />

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
    </Tabs>
  )
}

function invitationTone(status: AdminInvitationStatus) {
  if (status === 'pending') return 'warning' as const
  if (status === 'expired') return 'cancelled' as const
  return 'checkedOut' as const
}

function UserRowActions({
  item,
  role,
  onEdit,
  onPassword,
  onRevoke,
}: {
  item: AdminUser
  role: UserRole | undefined
  onEdit: () => void
  onPassword: () => void
  onRevoke: () => void
}) {
  if (!canManageAdminAccount(role, item)) {
    return <span className="text-xs text-muted-foreground">Лише перегляд</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {canUpdateAdminUsers(role) || canDeactivateUsers(role) ? (
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Редагувати
        </Button>
      ) : null}
      {canResetStaffPasswords(role) ? (
        <Button size="sm" variant="ghost" onClick={onPassword}>
          Пароль
        </Button>
      ) : null}
      {canRevokeStaffSessions(role) ? (
        <Button size="sm" variant="ghost" onClick={onRevoke}>
          Сесії
        </Button>
      ) : null}
    </div>
  )
}

function InviteAdminDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const invite = useInviteAdminUser()
  const allowedRoles = inviteableFrontendRoles(user?.role)
  const [confirming, setConfirming] = useState(false)
  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    values: { firstName: '', lastName: '', email: '', role: allowedRoles[0] ?? 'receptionist' },
  })

  function resetAndClose() {
    setConfirming(false)
    form.reset({ firstName: '', lastName: '', email: '', role: allowedRoles[0] ?? 'receptionist' })
    onOpenChange(false)
  }

  return (
    <>
      <Dialog
        open={open && !confirming}
        onOpenChange={(next) => {
          if (!next) resetAndClose()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запросити співробітника</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(() => {
              if (!canInviteAdminUsers(user?.role) || !canInviteRole(user?.role, form.getValues('role'))) {
                toast.error('Недостатньо прав для цієї дії')
                return
              }
              setConfirming(true)
            })}
          >
            <p className="text-sm text-muted-foreground">
              Користувач отримає лист із посиланням, щоб самостійно встановити пароль.
            </p>
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
            <Field label="Роль" error={form.formState.errors.role?.message}>
              <Select
                value={form.watch('role')}
                onValueChange={(value: 'admin' | 'manager' | 'receptionist') => {
                  if (!canInviteRole(user?.role, value)) return
                  form.setValue('role', value)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {staffInviteRoleLabel[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Скасувати
              </Button>
              <Button type="submit">Далі</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={open && confirming}
        title="Надіслати запрошення?"
        description={`Надіслати запрошення (${staffInviteRoleLabel[form.getValues('role')]}) на ${form.getValues('email')}? Пароль задасть запрошена особа.`}
        confirmLabel="Надіслати запрошення"
        pending={invite.isPending}
        onOpenChange={(next) => {
          if (!next) setConfirming(false)
        }}
        onConfirm={() => {
          if (!canInviteAdminUsers(user?.role) || !canInviteRole(user?.role, form.getValues('role'))) {
            toast.error('Недостатньо прав для цієї дії')
            return
          }
          const values = form.getValues()
          void invite
            .mutateAsync({
              email: values.email,
              firstName: values.firstName,
              lastName: values.lastName,
              role: values.role,
            })
            .then(() => {
              toast.success('Запрошення надіслано')
              resetAndClose()
            })
            .catch((error) => toast.error(userErrorMessage(error)))
        }}
      />
    </>
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
            <Button type="submit" disabled={create.isPending} loading={create.isPending}>
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
  const canToggleActive = canDeactivateUsers(user?.role) && canManageAdminAccount(user?.role, item)
  const canManage = canManageAdminAccount(user?.role, item)
  const canEditProfile = canUpdateAdminUsers(user?.role) && canManage
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
            if (!canManage || (!canEditProfile && !canManageRole && !canToggleActive)) {
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
              if (canToggleActive && !isSelf) {
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
              <Input disabled={!canEditProfile} {...form.register('firstName')} />
            </Field>
            <Field label="Прізвище" error={form.formState.errors.lastName?.message}>
              <Input disabled={!canEditProfile} {...form.register('lastName')} />
            </Field>
          </div>
          <Field label="Електронна пошта" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="off" disabled={!canEditProfile} {...form.register('email')} />
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
              disabled={!canToggleActive || isSelf}
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
            <Button type="submit" disabled={!canManage || update.isPending} loading={update.isPending}>
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
            if (!canResetStaffPasswords(currentUser?.role) || !canManageAdminAccount(currentUser?.role, user)) {
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
            <Button type="submit" disabled={!canManage || changePassword.isPending} loading={changePassword.isPending}>
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
  if (error.status === 404) {
    if (error.code === 'INVITE_INVALID') return 'Запрошення недійсне або вже використане'
    return error.message || 'Користувача не знайдено'
  }
  if (error.status === 410 && error.code === 'INVITE_EXPIRED') {
    return 'Термін дії запрошення минув. Надішліть нове запрошення.'
  }
  if (error.status === 503 && error.code === 'EMAIL_UNAVAILABLE') {
    return 'Не вдалося надіслати лист. Спробуйте ще раз пізніше.'
  }
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
