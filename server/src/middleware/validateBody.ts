import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

function flattenZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "_root";

    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ errors: flattenZodErrors(result.error) });
      return;
    }

    req.body = result.data;
    next();
  };
}
