import { Request, Response } from "express";
import { ServiceError } from "../utils/errors";
import * as authService from "../services/authService";
import type {
  AuthLoginInput,
  AuthRegisterInput,
} from "../validation/authSchema";

function handleError(error: unknown, res: Response): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const user = await authService.register(req.body as AuthRegisterInput);
    res.status(201).json({ user });
  } catch (error) {
    handleError(error, res);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = await authService.login(req.body as AuthLoginInput);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}
