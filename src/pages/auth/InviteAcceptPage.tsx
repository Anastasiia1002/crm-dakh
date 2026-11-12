import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { acceptAdminInvite, previewAdminInvite } from '@/api/users'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { consumeInviteTokenFromLocation } from '@/lib/invite-token'
import { staffInviteRoleLabel, userRoleLabel } from '@/lib/labels'
import { AuthLayout } from '@/layouts/AuthLayout'
import type { AdminInvitationPreview } from '@/types'

const schema = z
  .object({
    password: z.string().min(10, 'Пароль має містити щонайменше 10 символів').max(128, 'Пароль задовгий'),
    confirmPassword: z.string().min(1, 'Підтвердіть пароль'),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Паролі не збігаються' })
    }
  })

type FormValues = z.infer<typeof schema>

export function InviteAcceptPage() {
  const [token, setToken] = useState<string | null>(null)
  const [preview, setPreview] = useState<AdminInvitationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    const next = consumeInviteTokenFromLocation({})
    setToken(next)
    if (!next) {
      setLoadError('Запрошення недійсне або вже використане.')
      return
    }
    void previewAdminInvite(next)
      .then((value) => {
        setPreview(value)
        setLoadError(null)
      })
      .catch((error) => {
        setLoadError(errorMessage(error))
      })
  }, [])

  return (
    <AuthLayout>
      <div className="mb-8 lg:hidden">
        <Logo variant="dark" className="w-52" />
        <p className="mt-3 text-sm text-muted-foreground">Адмінпанель</p>
      </div>
      <h1 className="font-serif text-4xl font-medium">Запрошення</h1>
      {done ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Пароль збережено. Увійдіть своїми даними.</p>
          <Button asChild className="w-full">
            <Link to="/login">Увійти</Link>
          </Button>
        </div>
      ) : loadError ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">На сторінку входу</Link>
          </Button>
        </div>
      ) : !preview ? (
        <p className="mt-6 text-sm text-muted-foreground">Перевіряємо запрошення…</p>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!token) return
            try {
              await acceptAdminInvite(token, values.password)
              setDone(true)
            } catch (error) {
              form.setError('root', { message: errorMessage(error) })
            }
          })}
        >
          <p className="text-sm text-muted-foreground">
            {preview.firstName} {preview.lastName} · {preview.email}
          </p>
          <p className="text-sm text-muted-foreground">
            Призначена роль:{' '}
            {preview.role === 'owner' ? userRoleLabel.owner : staffInviteRoleLabel[preview.role]}
          </p>
          <p className="text-sm text-muted-foreground">Дійсне до {formatDateTime(preview.expiresAt)}</p>
          <Field label="Пароль" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </Field>
          <Field label="Підтвердження" error={form.formState.errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
          </Field>
          {form.formState.errors.root ? (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          ) : null}
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Прийняти запрошення
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
