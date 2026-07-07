import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";

export type UserRole = "Manager" | "TeamMember";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

interface CognitoIdTokenPayload {
  sub: string;
  email?: string;
  "cognito:groups"?: string[];
}

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID!,
});

function deriveRole(groups: string[] | undefined): UserRole | null {
  if (!groups?.length) {
    return null;
  }

  if (groups.includes("Manager")) {
    return "Manager";
  }

  if (groups.includes("TeamMember")) {
    return "TeamMember";
  }

  return null;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = (await verifier.verify(token)) as CognitoIdTokenPayload;
    const role = deriveRole(payload["cognito:groups"]);

    if (!role) {
      res.status(403).json({ message: "User is not assigned a valid role" });
      return;
    }

    if (!payload.email) {
      res.status(403).json({ message: "Token is missing email claim" });
      return;
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      role,
    };

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
