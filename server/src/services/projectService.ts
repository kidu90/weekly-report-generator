import Project from "../models/Project";
import { ProjectInput } from "../validation/projectSchema";
import { ServiceError } from "../utils/errors";

export async function listProjects() {
  return Project.find().sort({ name: 1 }).lean();
}

export async function getProjectById(id: string) {
  return Project.findById(id).lean();
}

export async function createProject(input: ProjectInput, createdBy: string) {
  const project = await Project.create({
    ...input,
    createdBy,
  });

  return project.toObject();
}

export async function updateProject(id: string, input: ProjectInput) {
  const project = await Project.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  }).lean();

  if (!project) {
    throw new ServiceError(404, "Project not found");
  }

  return project;
}

export async function deleteProject(id: string) {
  const project = await Project.findByIdAndDelete(id).lean();

  if (!project) {
    throw new ServiceError(404, "Project not found");
  }

  return project;
}

export async function assertProjectExists(id: string) {
  const exists = await Project.exists({ _id: id });

  if (!exists) {
    throw new ServiceError(404, "Project not found");
  }
}
