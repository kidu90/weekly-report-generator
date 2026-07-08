import { http } from "./http";
import type { AuthLoginInput, AuthRegisterInput } from "@/schemas/auth";
import type { AuthLoginResponse, AuthUser } from "@/types/api";

type AuthRegisterResponse = { user: AuthUser };

export async function register(input: AuthRegisterInput) {
  const response = await http.post<AuthRegisterResponse>(
    "/api/auth/register",
    input,
  );
  return response.data;
}

export async function login(input: AuthLoginInput) {
  const response = await http.post<AuthLoginResponse>("/api/auth/login", input);
  return response.data;
}
