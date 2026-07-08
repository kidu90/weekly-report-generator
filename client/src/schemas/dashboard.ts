import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  weekStart: z.date(),
});

export const dashboardSubmissionStatusQuerySchema = z.object({
  weekStart: z.date(),
});

export const dashboardWorkloadQuerySchema = z.object({
  from: z.date(),
  to: z.date(),
});

export const dashboardTrendQuerySchema = z.object({
  from: z.date(),
  to: z.date(),
  groupBy: z.enum(["person", "team"]),
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
export type DashboardSubmissionStatusQuery = z.infer<
  typeof dashboardSubmissionStatusQuerySchema
>;
export type DashboardWorkloadQuery = z.infer<
  typeof dashboardWorkloadQuerySchema
>;
export type DashboardTrendQuery = z.infer<typeof dashboardTrendQuerySchema>;
