import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormSetError,
} from "react-hook-form";

export function applyServerFieldErrors<TFieldValues extends FieldValues>(
  errors: unknown,
  setError: UseFormSetError<TFieldValues>,
) {
  if (!errors || typeof errors !== "object") {
    return;
  }

  for (const [key, message] of Object.entries(
    errors as Record<string, unknown>,
  )) {
    if (typeof message === "string") {
      setError(key as Path<TFieldValues>, { type: "server", message });
    }
  }
}

export function hasFieldErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}
