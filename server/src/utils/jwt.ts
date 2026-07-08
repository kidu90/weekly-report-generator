import jwt from "jsonwebtoken";
import { z } from "zod";
import type { AuthUser } from "../middleware/auth";

const tokenPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["Manager", "TeamMember"]),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function signAccessToken(user: AuthUser): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "1h") as jwt.SignOptions["expiresIn"];

  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn,
    },
  );
}

export function verifyAccessToken(token: string): AuthUser {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  const parsed = tokenPayloadSchema.safeParse(decoded);

  if (!parsed.success) {
    throw new Error("Invalid token payload");
  }

  return parsed.data;
}
