import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { createReport, getMyReports, updateReport } from '@/api/reports'
import { listProjects } from '@/api/projects'
import { ReportForm } from '@/components/forms/ReportForm'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { getApiErrorMessage } from '@/api/http'
import type { ReportPayload } from '@/schemas/report'

export function ReportEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reportId = params.id

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const reportsQuery = useQuery({
    queryKey: ['my-reports', 'editor'],
    queryFn: () => getMyReports(200),
    enabled: mode === 'edit',
  })

  const initialReport = useMemo(
    () => reportsQuery.data?.reports.find((report) => report._id === reportId) ?? null,
    [reportId, reportsQuery.data?.reports],
  )

  const mutation = useMutation({
    mutationFn: async (payload: ReportPayload) => {
      if (mode === 'edit' && reportId) {
        return updateReport(reportId, payload)
      }

      return createReport(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-reports'] })
      navigate('/reports', { replace: true })
    },
    onError: (error) => {
      console.error(getApiErrorMessage(error))
    },
  })

  if (projectsQuery.isLoading || (mode === 'edit' && reportsQuery.isLoading)) {
    return <PageSkeleton />
  }

  if (mode === 'edit' && !initialReport) {
    return (
      <EmptyState
        title="Report not found"
        description="We could not find that report in your history. Refresh the reports page and try again."
        actionLabel="Back to reports"
        onAction={() => navigate('/reports')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Team Member</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{mode === 'edit' ? 'Edit report' : 'Create report'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Fill in the same fixed report structure every week. The layout is intentionally consistent so edits stay quick and reviewable.
        </p>
      </div>

      <ReportForm
        projects={projectsQuery.data ?? []}
        initialReport={initialReport}
        submitLabel={mode === 'edit' ? 'Save changes' : 'Create report'}
        isPending={mutation.isPending}
        onSubmit={async (payload) => {
          await mutation.mutateAsync(payload)
        }}
      />
    </div>
  )
}