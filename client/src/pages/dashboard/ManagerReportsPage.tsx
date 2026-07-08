import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, RefreshCw } from 'lucide-react'
import { listReports } from '@/api/reports'
import { listProjects } from '@/api/projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatShortDate, getWeekRange, formatWeekLabel } from '@/lib/dates'

function weekStartParam(date: Date) {
  return date.toISOString()
}

export function ManagerReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [weekStart] = useState(() => getWeekRange(new Date()).weekStart)

  const week = searchParams.get('week') ?? weekStartParam(weekStart)
  const project = searchParams.get('project') ?? undefined
  const teamMember = searchParams.get('teamMember') ?? undefined
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const reportsQuery = useQuery({
    queryKey: ['manager-reports', { week, project, teamMember, from, to }],
    queryFn: () =>
      listReports({
        week: week ? new Date(week) : undefined,
        project,
        teamMember,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      }),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const reports = reportsQuery.data?.reports ?? []
  const projects = projectsQuery.data ?? []

  const memberOptions = useMemo(() => {
    const uniqueMembers = new Map<string, string>()

    for (const report of reports) {
      uniqueMembers.set(report.owner, typeof report.owner === 'string' ? report.owner : String(report.owner))
    }

    return Array.from(uniqueMembers.entries())
  }, [reports])

  if (reportsQuery.isLoading || projectsQuery.isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Manager</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review weekly team reports, filter by project, and jump to edits when needed.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => reportsQuery.refetch()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Defaults to the current week so newly submitted reports appear immediately.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={project ?? 'all'} onValueChange={(value) => setSearchParams((params) => {
            const next = new URLSearchParams(params)
            if (value === 'all') next.delete('project')
            else next.set('project', value)
            next.set('week', week)
            return next
          })}>
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((item) => (
                <SelectItem key={item._id} value={item._id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamMember ?? 'all'} onValueChange={(value) => setSearchParams((params) => {
            const next = new URLSearchParams(params)
            if (value === 'all') next.delete('teamMember')
            else next.set('teamMember', value)
            next.set('week', week)
            return next
          })}>
            <SelectTrigger>
              <SelectValue placeholder="All team members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team members</SelectItem>
              {memberOptions.map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={week} onValueChange={(value) => setSearchParams((params) => {
            const next = new URLSearchParams(params)
            next.set('week', value)
            return next
          })}>
            <SelectTrigger>
              <SelectValue placeholder="Current week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={weekStartParam(weekStart)}>{formatWeekLabel(weekStart, getWeekRange(new Date()).weekEndDate)}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={() => setSearchParams({ week: weekStartParam(weekStart) })}>
            Clear filters
          </Button>
        </CardContent>
      </Card>

      {reportsQuery.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Unable to load manager reports.</CardContent>
        </Card>
      ) : reports.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{formatWeekLabel(week)}</CardTitle>
            <CardDescription>{reports.length} report{reports.length === 1 ? '' : 's'} match the current filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team member</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report._id}>
                    <TableCell>
                      <div className="font-medium">{report.owner}</div>
                      <div className="text-xs text-muted-foreground">Week of {formatShortDate(report.weekStart)}</div>
                    </TableCell>
                    <TableCell>{typeof report.project === 'string' ? report.project : report.project.name}</TableCell>
                    <TableCell>
                      <Badge variant={report.status === 'submitted' ? 'success' : 'warning'}>{report.status}</Badge>
                    </TableCell>
                    <TableCell>{report.submittedAt ? formatShortDate(report.submittedAt) : 'Not submitted'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/reports/${report._id}/edit`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No reports found"
          description="Try widening the filters or move to the current week to see fresh submissions."
          actionLabel="Reset to current week"
          onAction={() => setSearchParams({ week: weekStartParam(weekStart) })}
        />
      )}
    </div>
  )
}