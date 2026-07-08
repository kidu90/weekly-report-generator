import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ProjectInput } from '@/schemas/project'
import type { ProjectSummary } from '@/types/api'

const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(120, 'Project name must be at most 120 characters'),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description must be at most 2000 characters'),
  membersText: z.string(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectFormProps {
  project?: ProjectSummary | null
  onSubmit: (payload: ProjectInput) => Promise<void>
  submitLabel: string
  isPending?: boolean
}

function stringToMembers(value: string) {
  return value
    .split(',')
    .map((member) => member.trim())
    .filter(Boolean)
}

export function ProjectForm({ project, onSubmit, submitLabel, isPending }: ProjectFormProps) {
  const initialValues = useMemo<ProjectFormValues>(() => {
    if (!project) {
      return {
        name: '',
        description: '',
        membersText: '',
      }
    }

    return {
      name: project.name,
      description: project.description,
      membersText: project.members.join(', '),
    }
  }, [project])

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    form.reset(initialValues)
  }, [form, initialValues])

  async function handleSubmit(values: ProjectFormValues) {
    await onSubmit({
      ...values,
      members: stringToMembers(values.membersText),
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...form.register('description')} />
            {form.formState.errors.description ? <p className="text-sm text-destructive">{form.formState.errors.description.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="members">Members</Label>
            <Textarea id="members" rows={3} placeholder="Comma-separated member IDs" {...form.register('membersText')} />
            <p className="text-xs text-muted-foreground">Enter comma-separated member IDs. Leave empty if the project has no assigned members yet.</p>
            {form.formState.errors.membersText ? <p className="text-sm text-destructive">{form.formState.errors.membersText.message}</p> : null}
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
            {form.formState.isSubmitting || isPending ? 'Saving...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}