import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { getMyReports } from '@/api/reports'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatShortDate, formatWeekLabel } from '@/lib/dates'

function statusVariant(status: string) {
  if (status === 'submitted') {
    return 'success'
  }

  return 'warning'
}

export function ReportsPage() {
  const reportsQuery = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => getMyReports(200),
  })

  if (reportsQuery.isLoading) {
    return <PageSkeleton />
  }

  const reports = reportsQuery.data?.reports ?? []

  const groupedReports = reports.reduce<Record<string, typeof reports>>((groups, report) => {
    const key = report.weekStart
    groups[key] = groups[key] ?? []
    groups[key].push(report)
    return groups
  }, {})

  const weeks = Object.keys(groupedReports).sort((left, right) => right.localeCompare(left))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Team Member</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">My reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track every weekly report you have drafted, submitted, or edited.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/reports/new">
            <Plus className="h-4 w-4" />
            Create report
          </Link>
        </Button>
      </div>

      {reportsQuery.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Unable to load reports right now.</CardContent>
        </Card>
      ) : weeks.length ? (
        <div className="space-y-4">
          {weeks.map((weekStart) => (
            <Card key={weekStart}>
              <CardHeader>
                <CardTitle>{formatWeekLabel(weekStart, groupedReports[weekStart][0]?.weekEndDate)}</CardTitle>
                <CardDescription>{groupedReports[weekStart].length} report{groupedReports[weekStart].length === 1 ? '' : 's'} this week</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedReports[weekStart].map((report) => (
                      <TableRow key={report._id}>
                        <TableCell>
                          <div className="font-medium">{typeof report.project === 'string' ? report.project : report.project.name}</div>
                          <div className="text-xs text-muted-foreground">Week of {formatShortDate(report.weekStart)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                        </TableCell>
                        <TableCell>{report.submittedAt ? formatShortDate(report.submittedAt) : 'Not submitted'}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/reports/${report._id}/edit`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No reports yet"
          description="Create your first weekly report to start tracking completed work and blockers."
          actionLabel="Create your first weekly report"
          onAction={() => window.location.assign('/reports/new')}
        />
      )}
    </div>
  )
}