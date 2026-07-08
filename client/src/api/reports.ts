import { http } from "./http";
import type { ReportPayload } from "@/schemas/report";
import type { ReportSummary, ReportsResponse } from "@/types/api";

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getMyReports(limit = 100, page = 1, project?: string) {
  const response = await http.get<ReportsResponse>(
    `/api/reports/me${buildQuery({ limit, page, project })}`,
  );

  return response.data;
}

export async function listReports(filters: {
  week?: Date;
  project?: string;
  teamMember?: string;
  from?: Date;
  to?: Date;
}) {
  const response = await http.get<ReportsResponse>(
    `/api/reports${buildQuery({
      week: filters.week?.toISOString(),
      project: filters.project,
      teamMember: filters.teamMember,
      from: filters.from?.toISOString(),
      to: filters.to?.toISOString(),
    })}`,
  );

  return response.data;
}

export async function createReport(input: ReportPayload) {
  const response = await http.post<ReportSummary>("/api/reports", input);
  return response.data;
}

export async function updateReport(id: string, input: Partial<ReportPayload>) {
  const response = await http.put<ReportSummary>(`/api/reports/${id}`, input);
  return response.data;
}

export async function submitReport(id: string) {
  const response = await http.patch<ReportSummary>(`/api/reports/${id}/submit`);
  return response.data;
}
