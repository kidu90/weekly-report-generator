import { z } from "zod";

const taskFieldSchema = z.union([
  z.string().trim().min(1, "Must be a non-empty string"),
  z
    .array(z.string().trim().min(1, "Each task must be a non-empty string"))
    .min(1, "At least one task is required"),
]);

const reportBaseSchema = z.object({
  weekStart: z.coerce.date({ error: "weekStart must be a valid date" }),
  weekEndDate: z.coerce.date({ error: "weekEndDate must be a valid date" }),
  project: z.string().min(1, "Project id is required"),
  tasksCompleted: taskFieldSchema,
  tasksPlanned: taskFieldSchema,
  blockers: taskFieldSchema,
  hoursWorked: z
    .number()
    .positive("hoursWorked must be a positive number")
    .max(168, "hoursWorked cannot exceed 168")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5000, "Notes must be at most 5000 characters")
    .optional(),
  status: z.enum(["draft", "submitted"]).default("draft"),
  submittedAt: z.coerce.date().optional(),
});

export const reportSchema = reportBaseSchema.refine(
  (data) => data.weekEndDate >= data.weekStart,
  {
    message: "weekEndDate must be on or after weekStart",
    path: ["weekEndDate"],
  },
);

export type ReportInput = z.infer<typeof reportSchema>;

export const reportUpdateSchema = reportBaseSchema
  .omit({ status: true, submittedAt: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  })
  .refine(
    (data) =>
      !data.weekStart ||
      !data.weekEndDate ||
      data.weekEndDate >= data.weekStart,
    {
      message: "weekEndDate must be on or after weekStart",
      path: ["weekEndDate"],
    },
  );

export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
