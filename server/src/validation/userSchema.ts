import { z } from "zod";

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  role: z.enum(["Manager", "TeamMember"]),
});

export type UserInput = z.infer<typeof userSchema>;
