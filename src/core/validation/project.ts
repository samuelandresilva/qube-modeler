import type { DatabaseProject } from "@/core/model";
import { validateDiagram } from "./diagram";
import {
  isObject,
  validateRequiredString,
  validateUniqueNames,
} from "./primitives";
import { validateSchema } from "./schema";
import { validateDatabaseFunction } from "./function";
import { validateDatabaseView } from "./view";

export function validateProject(project: unknown): DatabaseProject {
  if (!isObject(project)) throw new Error("Invalid project file.");
  const rawProject = project as Record<string, unknown>;
  validateRequiredString(rawProject.id, "Project id");
  if (rawProject.engine !== "postgresql")
    throw new Error("Only PostgreSQL projects are supported.");
  validateRequiredString(rawProject.name, "Project name");
  if (!Array.isArray(rawProject.schemas) || rawProject.schemas.length === 0)
    throw new Error("Project must have at least one schema.");

  const schemas = rawProject.schemas as unknown[];

  // Normalize checkConstraints and triggers on tables for backward compatibility
  schemas.forEach((schema) => {
    if (isObject(schema) && Array.isArray(schema.tables)) {
      schema.tables.forEach((table) => {
        if (isObject(table) && !Array.isArray(table.checkConstraints)) {
          table.checkConstraints = [];
        }
        if (isObject(table) && !Array.isArray(table.triggers)) {
          table.triggers = [];
        }
      });
    }
  });

  // Normalize functions for backward compatibility
  if (!Array.isArray(rawProject.functions)) {
    rawProject.functions = [];
  }
  const functions = rawProject.functions as unknown[];

  validateUniqueNames(
    schemas,
    "Project schemas",
    (schema) => schema.name,
  );
  schemas.forEach((schema) =>
    validateSchema(schema, schemas),
  );

  // Validate functions and check signature uniqueness
  const signatures = new Set<string>();
  functions.forEach((fn: unknown) => {
    validateDatabaseFunction(fn, schemas);
    if (isObject(fn)) {
      const schemaId = String(fn.schemaId);
      const name = String(fn.name);
      const args = Array.isArray(fn.arguments) ? fn.arguments : [];
      const argTypes = args
        .map((arg) => {
          return isObject(arg) && typeof arg.dataType === "string"
            ? arg.dataType.trim().toLowerCase()
            : "";
        })
        .join(",");
      const signature = `${schemaId}:${name.trim().toLowerCase()}:${argTypes}`;
      if (signatures.has(signature)) {
        throw new Error(`Duplicate function signature found in the same schema: name="${name}" with args=[${argTypes}]`);
      }
      signatures.add(signature);
    }
  });

  // Normalize views for backward compatibility
  if (!Array.isArray(rawProject.views)) {
    rawProject.views = [];
  }
  const views = rawProject.views as unknown[];
  views.forEach((view: unknown) => {
    validateDatabaseView(view, schemas);
  });

  // Normalize subjectAreas and textNotes for backward compatibility
  if (!Array.isArray(rawProject.subjectAreas)) {
    rawProject.subjectAreas = [];
  }
  if (!Array.isArray(rawProject.textNotes)) {
    rawProject.textNotes = [];
  }

  validateDiagram(project);
  return project as unknown as DatabaseProject;
}
