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
  
  // Clone to avoid mutating the original input object
  const cloned = structuredClone(project) as Record<string, unknown>;

  validateRequiredString(cloned.id, "Project id");
  if (cloned.engine !== "postgresql")
    throw new Error("Only PostgreSQL projects are supported.");
  validateRequiredString(cloned.name, "Project name");
  if (!Array.isArray(cloned.schemas) || cloned.schemas.length === 0)
    throw new Error("Project must have at least one schema.");

  const schemas = cloned.schemas as unknown[];

  // Normalize functions for backward compatibility
  const functions = Array.isArray(cloned.functions) ? cloned.functions : [];

  validateUniqueNames(
    schemas,
    "Project schemas",
    (schema) => (isObject(schema) && typeof schema.name === "string" ? schema.name : ""),
  );

  // Validate and normalize schemas (which handles table checkConstraints and triggers)
  const validatedSchemas = schemas.map((schema) =>
    validateSchema(schema, schemas),
  );

  // Validate functions and check signature uniqueness
  const signatures = new Set<string>();
  functions.forEach((fn: unknown) => {
    validateDatabaseFunction(fn, validatedSchemas);
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
  const rawViews = Array.isArray(cloned.views) ? cloned.views : [];
  const validatedViews = rawViews.map((view: unknown) => {
    return validateDatabaseView(view, validatedSchemas);
  });

  // Normalize subjectAreas and textNotes for backward compatibility
  const subjectAreas = Array.isArray(cloned.subjectAreas) ? cloned.subjectAreas : [];
  const textNotes = Array.isArray(cloned.textNotes) ? cloned.textNotes : [];

  const finalProject = {
    ...cloned,
    schemas: validatedSchemas,
    functions,
    views: validatedViews,
    subjectAreas,
    textNotes,
  };

  validateDiagram(finalProject);
  return finalProject as unknown as DatabaseProject;
}
