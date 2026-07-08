import { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { authLoginSchema, type AuthLoginInput } from '@/schemas/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { applyServerFieldErrors } from '@/lib/form'
import { getApiErrorMessage } from '@/api/http'

type LocationState = { email?: string }

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const form = useForm<AuthLoginInput>({
    resolver: zodResolver(authLoginSchema),
    defaultValues: {
      email: state?.email ?? '',
      password: '',
    },
  })

  useEffect(() => {
    if (state?.email) {
      form.setValue('email', state.email)
    }
  }, [form, state?.email])

  const loginMutation = useMutation({
    mutationFn: signIn,
    onSuccess: (user) => {
      navigate(user.role === 'Manager' ? '/dashboard' : '/reports', { replace: true })
    },
    onError: (error) => {
      applyServerFieldErrors<AuthLoginInput>((error as { response?: { data?: { errors?: Record<string, string> } } })?.response?.data?.errors, form.setError)
    },
  })

  function onSubmit(values: AuthLoginInput) {
    loginMutation.mutate(values)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your weekly report account to access the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
              {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
            </div>
            {loginMutation.isError ? <p className="text-sm text-destructive">{getApiErrorMessage(loginMutation.error)}</p> : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting || loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Need an account?{' '}
              <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/auth/register">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}