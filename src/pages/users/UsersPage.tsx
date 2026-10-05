import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState, SectionHeading } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAudit, useSaveUser, useUsers } from '@/hooks/useHotel'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { userRoleLabel } from '@/lib/labels'
import type { AdminUser, UserRole } from '@/types'

const schema = z.object({
  firstName: z.string().min(1, 'Вкажіть імʼя'),
  lastName: z.string().min(1, 'Вкажіть прізвище'),
  email: z.string().email('Вкажіть коректну електронну пошту'),
  role: z.enum(['owner', 'admin', 'receptionist']),
  active: z.enum(['yes', 'no']),
})

export function UsersPage() {
  const users = useUsers()
  const audit = useAudit()
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  if (!users.data || !audit.data) return <LoadingState />

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading title="Адміністратори" action={<Button onClick={() => setEditing('new')}>Додати користувача</Button>} />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Імʼя</TableHead>
              <TableHead>Пошта</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{userRoleLabel[user.role]}</TableCell>
                <TableCell>
                  <Badge tone={user.active ? 'success' : 'neutral'}>{user.active ? 'Активний' : 'Вимкнений'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(user)}>
                    Редагувати
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <SectionHeading title="Журнал дій" />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Час</TableHead>
              <TableHead>Хто</TableHead>
              <TableHead>Дія</TableHead>
              <TableHead>Деталі</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.data.map((entry) => {
              const actor = users.data.find((user) => user.id === entry.actorId)
              return (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>{actor ? `${actor.firstName} ${actor.lastName}` : '—'}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.details}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </section>

      <UserDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function UserDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean
  item?: AdminUser
  onOpenChange: (open: boolean) => void
}) {
  const save = useSaveUser()
  const { user } = useAuth()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      firstName: item?.firstName ?? '',
      lastName: item?.lastName ?? '',
      email: item?.email ?? '',
      role: item?.role === 'owner' || item?.role === 'admin' || item?.role === 'receptionist' ? item.role : 'receptionist',
      active: item?.active === false ? 'no' : 'yes',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редагувати користувача' : 'Новий користувач'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync({
                id: item?.id,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                role: values.role as UserRole,
                active: values.active === 'yes',
              })
              toast.success('Збережено')
              onOpenChange(false)
            } catch (error) {
              toast.error(errorMessage(error))
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
            <Input {...form.register('email')} />
          </Field>
          <Field label="Роль">
            <Select value={form.watch('role')} onValueChange={(value: 'owner' | 'admin' | 'receptionist') => form.setValue('role', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['owner', 'admin', 'receptionist'] as const).map((value) => (
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
              disabled={item?.id === user?.id}
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
            <Button type="submit" disabled={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
