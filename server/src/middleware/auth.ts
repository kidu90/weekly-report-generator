import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export type UserRole = "Manager" | "TeamMember";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    req.user = verifyAccessToken(token);

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
}
