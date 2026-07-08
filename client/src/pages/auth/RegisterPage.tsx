import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { register as registerRequest } from '@/api/auth'
import { authRegisterSchema, type AuthRegisterInput } from '@/schemas/auth'
import { getApiErrorMessage } from '@/api/http'
import { applyServerFieldErrors } from '@/lib/form'

export function RegisterPage() {
  const navigate = useNavigate()
  const form = useForm<AuthRegisterInput>({
    resolver: zodResolver(authRegisterSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      role: 'TeamMember',
    },
  })

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (_data, variables) => {
      navigate('/auth/login', { replace: true, state: { email: variables.email } })
    },
    onError: (error) => {
      applyServerFieldErrors<AuthRegisterInput>((error as { response?: { data?: { errors?: Record<string, string> } } })?.response?.data?.errors, form.setError)
    },
  })

  function onSubmit(values: AuthRegisterInput) {
    registerMutation.mutate(values)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Register a manager or team member for the weekly report app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" {...form.register('name')} />
              {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
              {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.watch('role')} onValueChange={(value) => form.setValue('role', value as AuthRegisterInput['role'], { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TeamMember">Team Member</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role ? <p className="text-sm text-destructive">{form.formState.errors.role.message}</p> : null}
            </div>
            {registerMutation.isError ? <p className="text-sm text-destructive">{getApiErrorMessage(registerMutation.error)}</p> : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting || registerMutation.isPending}>
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/auth/login">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}