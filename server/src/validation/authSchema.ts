import { z } from "zod";

export const authRegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((value) => value.toLowerCase()),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  role: z.enum(["Manager", "TeamMember"]),
});

export const authLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
