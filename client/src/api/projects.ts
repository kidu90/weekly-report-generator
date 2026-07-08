import { http } from "./http";
import type { ProjectInput } from "@/schemas/project";
import type { ProjectSummary } from "@/types/api";

export async function listProjects() {
  const response = await http.get<{ projects: ProjectSummary[] }>(
    "/api/projects",
  );
  return response.data.projects;
}

export async function createProject(input: ProjectInput) {
  const response = await http.post<ProjectSummary>("/api/projects", input);
  return response.data;
}

export async function updateProject(id: string, input: ProjectInput) {
  const response = await http.put<ProjectSummary>(`/api/projects/${id}`, input);
  return response.data;
}

export async function deleteProject(id: string) {
  const response = await http.delete<ProjectSummary>(`/api/projects/${id}`);
  return response.data;
}
