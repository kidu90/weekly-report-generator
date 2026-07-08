import { z } from "zod";

export const reportToolQueryShape = {
  weekStart: z.coerce.date({ error: "weekStart must be a valid date" }),
  project: z.string().trim().min(1, "project must be provided").optional(),
  teamMember: z
    .string()
    .trim()
    .min(1, "teamMember must be provided")
    .optional(),
};

export const reportToolQuerySchema = z.object(reportToolQueryShape);

export type ReportToolQuery = z.infer<typeof reportToolQuerySchema>;
