import { ServiceError } from "./errors";

export function requireParam(value: string | string[] | undefined, name: string): string {
  const resolved = Array.isArray(value) ? value[0] : value;

  if (!resolved) {
    throw new ServiceError(400, `Missing parameter: ${name}`);
  }

  return resolved;
}
