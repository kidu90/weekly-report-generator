import Report from "../models/Report";
import User from "../models/User";
import {
  endOfDay,
  getWeekRange,
  startOfDay,
  weeksInRange,
} from "../utils/dates";

export type DashboardSubmissionStatus = "submitted" | "pending" | "late";

export interface DashboardWeeklySummary {
  weekStart: string;
  weekEndDate: string;
  totalReportsSubmitted: number;
  activeTeamMemberCount: number;
  expectedReports: number;
  complianceRate: number;
  nonEmptyBlockers: number;
}

export interface DashboardSubmissionStatusEntry {
  userId: string;
  name: string;
  email: string;
  weekStart: string;
  weekEndDate: string;
  status: DashboardSubmissionStatus;
}

export interface DashboardWorkloadEntry {
  projectId: string;
  projectName: string;
  reportCount: number;
}

export interface DashboardTrendSeries {
  key: string;
  label: string;
}

export interface DashboardTrendPoint {
  weekStart: string;
  weekEndDate: string;
  label: string;
  [seriesKey: string]: string | number;
}

export interface DashboardTrendResult {
  from: string;
  to: string;
  groupBy: "person" | "team";
  series: DashboardTrendSeries[];
  data: DashboardTrendPoint[];
}

type WeeklyRange = { weekStart: Date; weekEndDate: Date };

function toIso(date: Date): string {
  return date.toISOString();
}

function countTaskFieldEntries(value: unknown): number {
  if (typeof value === "string") {
    return value.trim() ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.filter(
      (item) => typeof item === "string" && item.trim().length > 0,
    ).length;
  }

  return 0;
}

function computeSubmissionStatus(
  weekEndDate: Date,
  hasSubmittedReport: boolean,
): DashboardSubmissionStatus {
  if (hasSubmittedReport) {
    return "submitted";
  }

  return new Date() > endOfDay(weekEndDate) ? "late" : "pending";
}

async function listActiveTeamMembers(weekEndDate: Date) {
  return User.find({
    role: "TeamMember",
    createdAt: { $lte: weekEndDate },
  })
    .select("_id name email")
    .sort({ name: 1 })
    .lean();
}

async function listSubmittedReportsInWeek(range: WeeklyRange) {
  return Report.find({
    status: "submitted",
    weekStart: { $lte: endOfDay(range.weekEndDate) },
    weekEndDate: { $gte: startOfDay(range.weekStart) },
  })
    .select("owner project tasksCompleted blockers weekStart weekEndDate")
    .populate("project", "name")
    .lean();
}

function extractProjectIdentity(project: unknown): {
  projectId: string;
  projectName: string;
} {
  if (project && typeof project === "object") {
    const record = project as { _id?: unknown; name?: unknown };
    const projectId = String(record._id ?? "");
    const projectName =
      typeof record.name === "string" && record.name.trim()
        ? record.name
        : projectId;

    return {
      projectId: projectId || projectName,
      projectName,
    };
  }

  const projectId = String(project ?? "");

  return {
    projectId,
    projectName: projectId,
  };
}

export async function getWeeklySummary(
  weekStart: Date,
): Promise<DashboardWeeklySummary> {
  const range = getWeekRange(weekStart);
  const [submittedReports, activeTeamMembers] = await Promise.all([
    listSubmittedReportsInWeek(range),
    listActiveTeamMembers(range.weekEndDate),
  ]);

  const totalReportsSubmitted = submittedReports.length;
  const expectedReports = activeTeamMembers.length;
  const complianceRate =
    expectedReports > 0 ? totalReportsSubmitted / expectedReports : 0;
  const nonEmptyBlockers = submittedReports.reduce(
    (total, report) => total + countTaskFieldEntries(report.blockers),
    0,
  );

  return {
    weekStart: toIso(range.weekStart),
    weekEndDate: toIso(range.weekEndDate),
    totalReportsSubmitted,
    activeTeamMemberCount: expectedReports,
    expectedReports,
    complianceRate,
    nonEmptyBlockers,
  };
}

export async function getSubmissionStatusByMember(
  weekStart: Date,
): Promise<DashboardSubmissionStatusEntry[]> {
  const range = getWeekRange(weekStart);
  const [submittedReports, activeTeamMembers] = await Promise.all([
    listSubmittedReportsInWeek(range),
    listActiveTeamMembers(range.weekEndDate),
  ]);

  const submittedByOwner = new Set(
    submittedReports.map((report) => report.owner),
  );

  return activeTeamMembers.map((member) => ({
    userId: member._id,
    name: member.name,
    email: member.email,
    weekStart: toIso(range.weekStart),
    weekEndDate: toIso(range.weekEndDate),
    status: computeSubmissionStatus(
      range.weekEndDate,
      submittedByOwner.has(member._id),
    ),
  }));
}

export async function getWorkloadByProject(
  from: Date,
  to: Date,
): Promise<DashboardWorkloadEntry[]> {
  const rangeStart = getWeekRange(from).weekStart;
  const rangeEnd = getWeekRange(to).weekEndDate;

  const reports = await Report.find({
    status: "submitted",
    weekStart: { $gte: rangeStart, $lte: rangeEnd },
  })
    .select("project")
    .populate("project", "name")
    .lean();

  const counts = new Map<string, number>();
  const names = new Map<string, string>();

  for (const report of reports) {
    const { projectId, projectName } = extractProjectIdentity(report.project);
    counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
    names.set(projectId, projectName);
  }

  return Array.from(counts.entries())
    .map(([projectId, reportCount]) => ({
      projectId,
      projectName: names.get(projectId) ?? projectId,
      reportCount,
    }))
    .sort(
      (left, right) =>
        right.reportCount - left.reportCount ||
        left.projectName.localeCompare(right.projectName),
    );
}

export async function getTasksCompletedTrend(
  from: Date,
  to: Date,
  groupBy: "person" | "team",
): Promise<DashboardTrendResult> {
  const weekRanges = weeksInRange(from, to);
  const rangeStart = weekRanges[0]?.weekStart ?? getWeekRange(from).weekStart;
  const rangeEnd =
    weekRanges[weekRanges.length - 1]?.weekEndDate ??
    getWeekRange(to).weekEndDate;

  const reports = await Report.find({
    status: "submitted",
    weekStart: { $gte: rangeStart, $lte: rangeEnd },
  })
    .select("owner tasksCompleted weekStart")
    .lean();

  const teamMembers = await User.find({
    role: "TeamMember",
    createdAt: { $lte: rangeEnd },
  })
    .select("_id name")
    .sort({ name: 1 })
    .lean();

  const memberNames = new Map(
    teamMembers.map((member) => [member._id, member.name]),
  );
  const weekBuckets = new Map<string, Map<string, number>>();

  for (const weekRange of weekRanges) {
    weekBuckets.set(toIso(weekRange.weekStart), new Map<string, number>());
  }

  const seriesKeys = new Set<string>();

  for (const report of reports) {
    const weekStartIso = toIso(startOfDay(report.weekStart));
    const bucket = weekBuckets.get(weekStartIso);

    if (!bucket) {
      continue;
    }

    const reportCount = countTaskFieldEntries(report.tasksCompleted);

    if (groupBy === "team") {
      bucket.set("team", (bucket.get("team") ?? 0) + reportCount);
      seriesKeys.add("team");
      continue;
    }

    bucket.set(report.owner, (bucket.get(report.owner) ?? 0) + reportCount);
    seriesKeys.add(report.owner);
  }

  const series =
    groupBy === "team"
      ? [{ key: "team", label: "Team" }]
      : Array.from(seriesKeys)
          .sort((left, right) =>
            (memberNames.get(left) ?? left).localeCompare(
              memberNames.get(right) ?? right,
            ),
          )
          .map((key) => ({ key, label: memberNames.get(key) ?? key }));

  const data = weekRanges.map((weekRange) => {
    const bucket =
      weekBuckets.get(toIso(weekRange.weekStart)) ?? new Map<string, number>();
    const row: DashboardTrendPoint = {
      weekStart: toIso(weekRange.weekStart),
      weekEndDate: toIso(weekRange.weekEndDate),
      label: weekRange.weekStart.toISOString().slice(0, 10),
    };

    if (groupBy === "team") {
      row.team = bucket.get("team") ?? 0;
      return row;
    }

    for (const { key } of series) {
      row[key] = bucket.get(key) ?? 0;
    }

    return row;
  });

  return {
    from: toIso(rangeStart),
    to: toIso(rangeEnd),
    groupBy,
    series,
    data,
  };
}
