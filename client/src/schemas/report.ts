import { z } from "zod";

const textField = z.string().trim().min(1, "This field is required");

export const reportFormSchema = z.object({
  weekStart: z.date({ message: "weekStart must be a valid date" }),
  weekEndDate: z.date({ message: "weekEndDate must be a valid date" }),
  project: z.string().min(1, "Project is required"),
  tasksCompleted: textField,
  tasksPlanned: textField,
  blockers: textField,
  hoursWorked: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type ReportFormInput = z.infer<typeof reportFormSchema>;

export type ReportPayload = {
  weekStart: string;
  weekEndDate: string;
  project: string;
  tasksCompleted: string | string[];
  tasksPlanned: string | string[];
  blockers: string | string[];
  hoursWorked?: number;
  notes?: string;
};

export type ReportFilterValues = {
  teamMember?: string;
  project?: string;
  from?: Date;
  to?: Date;
};
