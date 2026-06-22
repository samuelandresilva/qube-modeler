import type { DatabaseProject } from "@/core/model";
import { validateDiagram } from "./diagram";
import {
  isObject,
  validateRequiredString,
  validateUniqueNames,
} from "./primitives";
import { validateSchema } from "./schema";

export function validateProject(project: unknown): DatabaseProject {
  if (!isObject(project)) throw new Error("Invalid project file.");
  validateRequiredString(project.id, "Project id");
  if (project.engine !== "postgresql")
    throw new Error("Only PostgreSQL projects are supported.");
  validateRequiredString(project.name, "Project name");
  if (!Array.isArray(project.schemas) || project.schemas.length === 0)
    throw new Error("Project must have at least one schema.");
  validateUniqueNames(
    project.schemas,
    "Project schemas",
    (schema) => schema.name,
  );
  project.schemas.forEach((schema) =>
    validateSchema(schema, project.schemas as unknown[]),
  );
  validateDiagram(project);
  return project as unknown as DatabaseProject;
}
