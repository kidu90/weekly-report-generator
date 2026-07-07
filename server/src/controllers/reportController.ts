import { Request, Response } from "express";
import { ServiceError } from "../utils/errors";
import { requireParam } from "../utils/request";
import * as reportService from "../services/reportService";
import { ReportInput, ReportUpdateInput } from "../validation/reportSchema";

function handleError(error: unknown, res: Response): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ServiceError(400, `Invalid date: ${value}`);
  }

  return date;
}

export async function createReport(req: Request, res: Response): Promise<void> {
  try {
    const report = await reportService.createReport(req.body as ReportInput, req.user!.userId);
    res.status(201).json(report);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateReport(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query.force === "true";
    const report = await reportService.updateReport(
      requireParam(req.params.id, "id"),
      req.user!.userId,
      req.body as ReportUpdateInput,
      force
    );
    res.json(report);
  } catch (error) {
    handleError(error, res);
  }
}

export async function submitReport(req: Request, res: Response): Promise<void> {
  try {
    const report = await reportService.submitReport(requireParam(req.params.id, "id"), req.user!.userId);
    res.json(report);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getMyReports(req: Request, res: Response): Promise<void> {
  try {
    const result = await reportService.getMyReports(req.user!.userId, {
      project: typeof req.query.project === "string" ? req.query.project : undefined,
      page: parsePositiveInt(req.query.page, 1),
      limit: parsePositiveInt(req.query.limit, 10),
    });

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}

export async function listReports(req: Request, res: Response): Promise<void> {
  try {
    const result = await reportService.listReportsForManager({
      week: parseDate(req.query.week),
      teamMember: typeof req.query.teamMember === "string" ? req.query.teamMember : undefined,
      project: typeof req.query.project === "string" ? req.query.project : undefined,
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    });

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}
