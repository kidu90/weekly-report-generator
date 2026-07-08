import { z } from "zod";

export const dashboardSummaryQueryShape = {
  weekStart: z.coerce.date({ error: "weekStart must be a valid date" }),
};

export const dashboardSubmissionStatusQueryShape = {
  weekStart: z.coerce.date({ error: "weekStart must be a valid date" }),
};

export const dashboardWorkloadQueryShape = {
  from: z.coerce.date({ error: "from must be a valid date" }),
  to: z.coerce.date({ error: "to must be a valid date" }),
};

export const dashboardTrendQueryShape = {
  from: z.coerce.date({ error: "from must be a valid date" }),
  to: z.coerce.date({ error: "to must be a valid date" }),
  groupBy: z.enum(["person", "team"]),
};

export const dashboardSummaryQuerySchema = z.object(dashboardSummaryQueryShape);

export const dashboardSubmissionStatusQuerySchema = z.object(
  dashboardSubmissionStatusQueryShape,
);

export const dashboardWorkloadQuerySchema = z
  .object(dashboardWorkloadQueryShape)
  .refine((data) => data.to >= data.from, {
    message: "to must be on or after from",
    path: ["to"],
  });

export const dashboardTrendQuerySchema = z
  .object(dashboardTrendQueryShape)
  .refine((data) => data.to >= data.from, {
    message: "to must be on or after from",
    path: ["to"],
  });

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
export type DashboardSubmissionStatusQuery = z.infer<
  typeof dashboardSubmissionStatusQuerySchema
>;
export type DashboardWorkloadQuery = z.infer<
  typeof dashboardWorkloadQuerySchema
>;
export type DashboardTrendQuery = z.infer<typeof dashboardTrendQuerySchema>;
