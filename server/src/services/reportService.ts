import mongoose from "mongoose";
import Report from "../models/Report";
import User from "../models/User";
import { ReportInput } from "../validation/reportSchema";
import { ServiceError } from "../utils/errors";
import {
  endOfDay,
  getWeekRange,
  isSameWeek,
  startOfDay,
  weeksInRange,
} from "../utils/dates";
import { assertProjectExists } from "./projectService";

export type SubmissionStatus = "submitted" | "pending" | "late";

export interface SubmissionStatusEntry {
  userId: string;
  weekStart: Date;
  weekEndDate: Date;
  status: SubmissionStatus;
}

export interface ManagerReportFilters {
  week?: Date;
  teamMember?: string;
  project?: string;
  from?: Date;
  to?: Date;
}

export interface MyReportsFilters {
  project?: string;
  page: number;
  limit: number;
}

type ReportUpdateInput = Partial<
  Omit<ReportInput, "status" | "submittedAt">
>;

function computeSubmissionStatus(
  weekStart: Date,
  weekEndDate: Date,
  hasSubmittedReport: boolean
): SubmissionStatus {
  if (hasSubmittedReport) {
    return "submitted";
  }

  const now = new Date();

  if (now > endOfDay(weekEndDate)) {
    return "late";
  }

  return "pending";
}

function buildReportQuery(filters: ManagerReportFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filters.teamMember) {
    query.owner = filters.teamMember;
  }

  if (filters.project) {
    if (!mongoose.Types.ObjectId.isValid(filters.project)) {
      throw new ServiceError(400, "Invalid project id");
    }

    query.project = filters.project;
  }

  if (filters.week) {
    const weekDate = startOfDay(filters.week);
    query.weekStart = { $lte: weekDate };
    query.weekEndDate = { $gte: weekDate };
  }

  if (filters.from || filters.to) {
    query.weekStart = query.weekStart ?? {};

    if (filters.from) {
      (query.weekStart as Record<string, Date>).$gte = startOfDay(filters.from);
    }

    if (filters.to) {
      query.weekEndDate = { $lte: endOfDay(filters.to) };
    }
  }

  return query;
}

function resolveStatusWeeks(filters: ManagerReportFilters): Array<{ weekStart: Date; weekEndDate: Date }> {
  if (filters.week) {
    return [getWeekRange(filters.week)];
  }

  if (filters.from && filters.to) {
    return weeksInRange(filters.from, filters.to);
  }

  if (filters.from) {
    return [getWeekRange(filters.from)];
  }

  if (filters.to) {
    return [getWeekRange(filters.to)];
  }

  return [getWeekRange(new Date())];
}

export async function createReport(input: ReportInput, ownerId: string) {
  if (!mongoose.Types.ObjectId.isValid(input.project)) {
    throw new ServiceError(400, "Invalid project id");
  }

  await assertProjectExists(input.project);

  const report = await Report.create({
    owner: ownerId,
    weekStart: input.weekStart,
    weekEndDate: input.weekEndDate,
    project: input.project,
    tasksCompleted: input.tasksCompleted,
    tasksPlanned: input.tasksPlanned,
    blockers: input.blockers,
    hoursWorked: input.hoursWorked,
    notes: input.notes,
    status: "draft",
  });

  return report.toObject();
}

export async function updateReport(
  id: string,
  ownerId: string,
  input: ReportUpdateInput,
  force: boolean
) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ServiceError(400, "Invalid report id");
  }

  const report = await Report.findById(id);

  if (!report) {
    throw new ServiceError(404, "Report not found");
  }

  if (report.owner !== ownerId) {
    throw new ServiceError(403, "You can only edit your own reports");
  }

  if (report.status === "submitted" && !force) {
    throw new ServiceError(
      409,
      "Submitted reports are read-only. Pass ?force=true to allow post-submission edits."
    );
  }

  if (input.project) {
    if (!mongoose.Types.ObjectId.isValid(input.project)) {
      throw new ServiceError(400, "Invalid project id");
    }

    await assertProjectExists(input.project);
  }

  Object.assign(report, input);

  if (force && report.status === "submitted") {
    report.submittedAt = new Date();
  }

  await report.save();

  return report.toObject();
}

export async function submitReport(id: string, ownerId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ServiceError(400, "Invalid report id");
  }

  const report = await Report.findById(id);

  if (!report) {
    throw new ServiceError(404, "Report not found");
  }

  if (report.owner !== ownerId) {
    throw new ServiceError(403, "You can only submit your own reports");
  }

  if (report.status === "submitted") {
    throw new ServiceError(409, "Report is already submitted");
  }

  report.status = "submitted";
  report.submittedAt = new Date();
  await report.save();

  return report.toObject();
}

export async function getMyReports(ownerId: string, filters: MyReportsFilters) {
  const query: Record<string, unknown> = { owner: ownerId };

  if (filters.project) {
    if (!mongoose.Types.ObjectId.isValid(filters.project)) {
      throw new ServiceError(400, "Invalid project id");
    }

    query.project = filters.project;
  }

  const page = Math.max(filters.page, 1);
  const limit = Math.min(Math.max(filters.limit, 1), 50);
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find(query).sort({ weekStart: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments(query),
  ]);

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function listReportsForManager(filters: ManagerReportFilters) {
  const query = buildReportQuery(filters);

  const reports = await Report.find(query)
    .sort({ weekStart: -1, owner: 1 })
    .populate("project", "name")
    .lean();

  const statusWeeks = resolveStatusWeeks(filters);
  const memberQuery: Record<string, unknown> = { role: "TeamMember" };

  if (filters.teamMember) {
    memberQuery._id = filters.teamMember;
  }

  const teamMembers = await User.find(memberQuery).select("_id").lean();
  const submissionStatus: SubmissionStatusEntry[] = [];

  for (const week of statusWeeks) {
    for (const member of teamMembers) {
      const memberReports = reports.filter(
        (report) =>
          report.owner === member._id &&
          isSameWeek(
            { weekStart: new Date(report.weekStart), weekEndDate: new Date(report.weekEndDate) },
            week
          )
      );

      const hasSubmittedReport = memberReports.some((report) => report.status === "submitted");

      submissionStatus.push({
        userId: member._id,
        weekStart: week.weekStart,
        weekEndDate: week.weekEndDate,
        status: computeSubmissionStatus(week.weekStart, week.weekEndDate, hasSubmittedReport),
      });
    }
  }

  return { reports, submissionStatus };
}
