export type UserRole = "Manager" | "TeamMember";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
}

export interface ProjectSummary {
  _id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReportStatus = "draft" | "submitted";

export interface ReportSummary {
  _id: string;
  owner: string;
  weekStart: string;
  weekEndDate: string;
  project: ProjectSummary | string;
  tasksCompleted: string | string[];
  tasksPlanned: string | string[];
  blockers: string | string[];
  hoursWorked?: number;
  notes?: string;
  status: ReportStatus;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportsResponse {
  reports: ReportSummary[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  submissionStatus?: SubmissionStatusEntry[];
}

export type SubmissionStatus = "submitted" | "pending" | "late";

export interface SubmissionStatusEntry {
  userId: string;
  weekStart: string;
  weekEndDate: string;
  status: SubmissionStatus;
  name?: string;
  email?: string;
}

export interface DashboardSummaryResponse {
  weekStart: string;
  weekEndDate: string;
  totalReportsSubmitted: number;
  activeTeamMemberCount: number;
  expectedReports: number;
  complianceRate: number;
  nonEmptyBlockers: number;
}

export interface DashboardTrendSeries {
  key: string;
  label: string;
}

export interface DashboardTrendPoint {
  weekStart: string;
  weekEndDate: string;
  label: string;
  [key: string]: string | number;
}

export interface DashboardTrendResponse {
  from: string;
  to: string;
  groupBy: "person" | "team";
  series: DashboardTrendSeries[];
  data: DashboardTrendPoint[];
}

export interface WorkloadEntry {
  projectId: string;
  projectName: string;
  reportCount: number;
}

export interface DashboardWorkloadResponse {
  workload: WorkloadEntry[];
}
