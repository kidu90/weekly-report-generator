import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let getToken: () => string | null = () => null;

export function setAuthTokenGetter(getter: () => string | null) {
  getToken = getter;
}

export const http = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as { message?: string } | undefined;
    return response?.message || "Request failed";
  }

  return error instanceof Error ? error.message : "Request failed";
}
