import { Request, Response } from "express";
import { ServiceError } from "../utils/errors";
import * as dashboardService from "../services/dashboardService";
import {
  DashboardSummaryQuery,
  DashboardSubmissionStatusQuery,
  DashboardWorkloadQuery,
  DashboardTrendQuery,
} from "../validation/dashboardQuerySchema";

function handleError(error: unknown, res: Response): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const query = req.validatedQuery as DashboardSummaryQuery;
    const summary = await dashboardService.getWeeklySummary(query.weekStart);
    res.json(summary);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getSubmissionStatus(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const query = req.validatedQuery as DashboardSubmissionStatusQuery;
    const submissionStatus = await dashboardService.getSubmissionStatusByMember(
      query.weekStart,
    );
    res.json({ submissionStatus });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getWorkload(req: Request, res: Response): Promise<void> {
  try {
    const query = req.validatedQuery as DashboardWorkloadQuery;
    const workload = await dashboardService.getWorkloadByProject(
      query.from,
      query.to,
    );
    res.json({ workload });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getTrend(req: Request, res: Response): Promise<void> {
  try {
    const query = req.validatedQuery as DashboardTrendQuery;
    const trend = await dashboardService.getTasksCompletedTrend(
      query.from,
      query.to,
      query.groupBy,
    );
    res.json(trend);
  } catch (error) {
    handleError(error, res);
  }
}
