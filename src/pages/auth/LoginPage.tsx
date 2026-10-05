import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { AuthLayout } from '@/layouts/AuthLayout'

const schema = z.object({
  email: z.string().min(1, 'Вкажіть електронну пошту').email('Вкажіть коректну електронну пошту'),
  password: z.string().min(1, 'Вкажіть пароль'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (!isLoading && user) return <Navigate to="/admin" replace />

  return (
    <AuthLayout>
      <div className="mb-8 lg:hidden">
        <Logo variant="dark" className="w-52" />
        <p className="mt-3 text-sm text-muted-foreground">Адмінпанель</p>
      </div>
      <h1 className="font-serif text-4xl font-medium">Вхід</h1>
      <p className="mt-2 text-sm text-muted-foreground">Для співробітників готелю.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await login(values.email, values.password)
            navigate('/admin')
          } catch (error) {
            form.setError('root', { message: errorMessage(error) })
          }
        })}
      >
        <Field label="Електронна пошта" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="username" {...form.register('email')} />
        </Field>
        <Field label="Пароль" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        {form.formState.errors.root ? (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isLoading}>
          Увійти
        </Button>
      </form>
    </AuthLayout>
  )
}
