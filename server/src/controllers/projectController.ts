import { Request, Response } from "express";
import { requireParam } from "../utils/request";
import { ServiceError } from "../utils/errors";
import * as projectService from "../services/projectService";
import { ProjectInput } from "../validation/projectSchema";

function handleError(error: unknown, res: Response): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}

export async function listProjects(_req: Request, res: Response): Promise<void> {
  try {
    const projects = await projectService.listProjects();
    res.json({ projects });
  } catch (error) {
    handleError(error, res);
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await projectService.createProject(req.body as ProjectInput, req.user!.userId);
    res.status(201).json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await projectService.updateProject(requireParam(req.params.id, "id"), req.body as ProjectInput);
    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await projectService.deleteProject(requireParam(req.params.id, "id"));
    res.json(project);
  } catch (error) {
    handleError(error, res);
  }
}
