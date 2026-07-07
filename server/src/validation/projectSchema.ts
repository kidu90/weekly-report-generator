import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120, "Project name must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be at most 2000 characters"),
  members: z.array(z.string().min(1, "Member id is required")).default([]),
});

export type ProjectInput = z.infer<typeof projectSchema>;
