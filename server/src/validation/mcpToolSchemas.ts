import { z } from "zod";

const isoDateString = z
  .string()
  .trim()
  .min(1, "date is required");

export const mcpReportToolQueryShape = {
  weekStart: isoDateString,
  project: z.string().trim().min(1, "project must be provided").optional(),
  teamMember: z
    .string()
    .trim()
    .min(1, "teamMember must be provided")
    .optional(),
};

export const mcpDashboardSummaryQueryShape = {
  weekStart: isoDateString,
};

export const mcpDashboardSubmissionStatusQueryShape = {
  weekStart: isoDateString,
};

export const mcpDashboardWorkloadQueryShape = {
  from: isoDateString,
  to: isoDateString,
};

export const mcpDashboardTrendQueryShape = {
  from: isoDateString,
  to: isoDateString,
  groupBy: z.enum(["person", "team"]),
};

export function parseMcpDate(value: string, field: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }

  return date;
}
