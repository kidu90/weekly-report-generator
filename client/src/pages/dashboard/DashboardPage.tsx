import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addWeeks } from 'date-fns'
import { getDashboardSummary, getSubmissionStatus, getTasksCompletedTrend, getWorkloadByProject } from '@/api/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getWeekRange, formatWeekLabel } from '@/lib/dates'
import { getApiErrorMessage } from '@/api/http'

const trendPalette = ['#8b5cf6', '#06b6d4', '#f97316', '#10b981', '#ef4444', '#6366f1']

export function DashboardPage() {
  const [groupBy, setGroupBy] = useState<'person' | 'team'>('team')

  const { weekStart } = getWeekRange(new Date())
  const trendRange = useMemo(() => {
    const from = addWeeks(weekStart, -7)
    const to = new Date()
    return { from, to }
  }, [weekStart])

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', weekStart.toISOString()],
    queryFn: () => getDashboardSummary(weekStart),
  })

  const statusQuery = useQuery({
    queryKey: ['dashboard-status', weekStart.toISOString()],
    queryFn: () => getSubmissionStatus(weekStart),
  })

  const trendQuery = useQuery({
    queryKey: ['dashboard-trend', trendRange.from.toISOString(), trendRange.to.toISOString(), groupBy],
    queryFn: () => getTasksCompletedTrend(trendRange.from, trendRange.to, groupBy),
  })

  const workloadQuery = useQuery({
    queryKey: ['dashboard-workload', trendRange.from.toISOString(), trendRange.to.toISOString()],
    queryFn: () => getWorkloadByProject(trendRange.from, trendRange.to),
  })

  useEffect(() => {
    for (const [label, query] of [
      ['summary', summaryQuery],
      ['submission-status', statusQuery],
      ['trend', trendQuery],
      ['workload', workloadQuery],
    ] as const) {
      if (query.isError) {
        console.error(`Dashboard ${label} query failed`, getApiErrorMessage(query.error))
      }
    }
  }, [summaryQuery.error, summaryQuery.isError, statusQuery.error, statusQuery.isError, trendQuery.error, trendQuery.isError, workloadQuery.error, workloadQuery.isError])

  if (summaryQuery.isLoading || statusQuery.isLoading || trendQuery.isLoading || workloadQuery.isLoading) {
    return <PageSkeleton />
  }

  const summary = summaryQuery.data
  const trend = trendQuery.data
  const workload = workloadQuery.data ?? []
  const statuses = statusQuery.data ?? []

  const errorQuery = summaryQuery.error ?? statusQuery.error ?? trendQuery.error ?? workloadQuery.error

  if (!summary || !trend) {
    return <PageSkeleton />
  }

  if (errorQuery) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Manager dashboard data failed to load. Check the browser console for the query error and verify the current user is signed in as a Manager.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Manager</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Monitor weekly compliance, blockers, and throughput at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Reports submitted</CardDescription>
            <CardTitle className="text-3xl">{summary.totalReportsSubmitted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Compliance rate</CardDescription>
            <CardTitle className="text-3xl">{Math.round(summary.complianceRate * 100)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Open blockers</CardDescription>
            <CardTitle className="text-3xl">{summary.nonEmptyBlockers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Tasks completed trend</CardTitle>
              <CardDescription>{formatWeekLabel(trend.from, trend.to)}</CardDescription>
            </div>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'person' | 'team')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="person">Person</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-90">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                {trend.series.map((series, index) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={trendPalette[index % trendPalette.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workload by project</CardTitle>
            <CardDescription>{formatWeekLabel(trend.from, trend.to)}</CardDescription>
          </CardHeader>
          <CardContent className="h-90">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="projectName" tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={80} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="reportCount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission status by member</CardTitle>
          <CardDescription>{formatWeekLabel(summary.weekStart, summary.weekEndDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {statuses.map((status) => (
              <div key={status.userId} className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{status.name ?? status.userId}</p>
                    <p className="text-xs text-muted-foreground">{status.email ?? 'Member'}</p>
                  </div>
                  <Badge
                    variant={
                      status.status === 'submitted'
                        ? 'success'
                        : status.status === 'pending'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {status.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}