import { http } from "./http";
import type {
  DashboardSummaryResponse,
  DashboardTrendResponse,
  DashboardWorkloadResponse,
  SubmissionStatusEntry,
} from "@/types/api";

function queryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getDashboardSummary(weekStart: Date) {
  const response = await http.get<DashboardSummaryResponse>(
    `/api/dashboard/summary${queryString({ weekStart: weekStart.toISOString() })}`,
  );

  return response.data;
}

export async function getSubmissionStatus(weekStart: Date) {
  const response = await http.get<{
    submissionStatus: SubmissionStatusEntry[];
  }>(
    `/api/dashboard/submission-status${queryString({ weekStart: weekStart.toISOString() })}`,
  );

  return response.data.submissionStatus;
}

export async function getWorkloadByProject(from: Date, to: Date) {
  const response = await http.get<DashboardWorkloadResponse>(
    `/api/dashboard/workload${queryString({ from: from.toISOString(), to: to.toISOString() })}`,
  );

  return response.data.workload;
}

export async function getTasksCompletedTrend(
  from: Date,
  to: Date,
  groupBy: "person" | "team",
) {
  const response = await http.get<DashboardTrendResponse>(
    `/api/dashboard/trend${queryString({ from: from.toISOString(), to: to.toISOString(), groupBy })}`,
  );

  return response.data;
}
