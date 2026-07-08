import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WeekRangePicker } from './WeekRangePicker'
import { formatShortDate, getWeekRange } from '@/lib/dates'
import { reportFormSchema, type ReportFormInput, type ReportPayload } from '@/schemas/report'
import type { ProjectSummary, ReportSummary } from '@/types/api'

interface ReportFormProps {
  projects: ProjectSummary[]
  initialReport?: ReportSummary | null
  onSubmit: (payload: ReportPayload) => Promise<void>
  submitLabel: string
  isPending?: boolean
}

function toTextValue(value: string | string[] | undefined) {
  if (!value) {
    return ''
  }

  return Array.isArray(value) ? value.join('\n') : value
}

function normalizeTextField(value: string) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return lines[0] ?? value.trim()
  }

  return lines
}

function toPayload(values: ReportFormInput): ReportPayload {
  return {
    weekStart: values.weekStart.toISOString(),
    weekEndDate: values.weekEndDate.toISOString(),
    project: values.project,
    tasksCompleted: normalizeTextField(values.tasksCompleted),
    tasksPlanned: normalizeTextField(values.tasksPlanned),
    blockers: normalizeTextField(values.blockers),
    hoursWorked: values.hoursWorked?.trim() ? Number(values.hoursWorked) : undefined,
    notes: values.notes?.trim() ? values.notes.trim() : undefined,
  }
}

export function ReportForm({ projects, initialReport, onSubmit, submitLabel, isPending }: ReportFormProps) {
  const initialValues = useMemo<ReportFormInput>(() => {
    if (!initialReport) {
      const today = new Date()
      const weekRange = getWeekRange(today)

      return {
        weekStart: weekRange.weekStart,
        weekEndDate: weekRange.weekEndDate,
        project: projects[0]?._id ?? '',
        tasksCompleted: '',
        tasksPlanned: '',
        blockers: '',
        hoursWorked: '',
        notes: '',
      }
    }

    return {
      weekStart: new Date(initialReport.weekStart),
      weekEndDate: new Date(initialReport.weekEndDate),
      project: typeof initialReport.project === 'string' ? initialReport.project : initialReport.project._id,
      tasksCompleted: toTextValue(initialReport.tasksCompleted),
      tasksPlanned: toTextValue(initialReport.tasksPlanned),
      blockers: toTextValue(initialReport.blockers),
      hoursWorked: initialReport.hoursWorked?.toString() ?? '',
      notes: initialReport.notes ?? '',
    }
  }, [initialReport, projects])

  const form = useForm<ReportFormInput>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    form.reset(initialValues)
  }, [form, initialValues])

  async function handleSubmit(values: ReportFormInput) {
    await onSubmit(toPayload(values))
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="space-y-2">
            <Label>Week range</Label>
            <WeekRangePicker
              weekStart={form.watch('weekStart')}
              weekEndDate={form.watch('weekEndDate')}
              onChange={(weekStart, weekEndDate) => {
                form.setValue('weekStart', weekStart, { shouldValidate: true })
                form.setValue('weekEndDate', weekEndDate, { shouldValidate: true })
              }}
            />
            <div className="text-xs text-muted-foreground">
              Current selection: {formatShortDate(form.watch('weekStart'))} - {formatShortDate(form.watch('weekEndDate'))}
            </div>
            {form.formState.errors.weekStart ? <p className="text-sm text-destructive">{form.formState.errors.weekStart.message}</p> : null}
            {form.formState.errors.weekEndDate ? <p className="text-sm text-destructive">{form.formState.errors.weekEndDate.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={form.watch('project')} onValueChange={(value) => form.setValue('project', value, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.project ? <p className="text-sm text-destructive">{form.formState.errors.project.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasksCompleted">Tasks completed</Label>
            <Textarea id="tasksCompleted" rows={4} placeholder="One item per line" {...form.register('tasksCompleted')} />
            {form.formState.errors.tasksCompleted ? <p className="text-sm text-destructive">{form.formState.errors.tasksCompleted.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasksPlanned">Tasks planned</Label>
            <Textarea id="tasksPlanned" rows={4} placeholder="One item per line" {...form.register('tasksPlanned')} />
            {form.formState.errors.tasksPlanned ? <p className="text-sm text-destructive">{form.formState.errors.tasksPlanned.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="blockers">Blockers</Label>
            <Textarea id="blockers" rows={3} placeholder="Describe blockers or write 'None'" {...form.register('blockers')} />
            {form.formState.errors.blockers ? <p className="text-sm text-destructive">{form.formState.errors.blockers.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hoursWorked">Hours worked</Label>
              <Input id="hoursWorked" type="number" min="0" max="168" step="0.5" {...form.register('hoursWorked')} />
              {form.formState.errors.hoursWorked ? <p className="text-sm text-destructive">{form.formState.errors.hoursWorked.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / links</Label>
              <Textarea id="notes" rows={3} placeholder="Optional notes or links" {...form.register('notes')} />
              {form.formState.errors.notes ? <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
              {form.formState.isSubmitting || isPending ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}