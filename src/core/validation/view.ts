import { isObject, validateRequiredString, validateUniqueNames } from "./primitives";
import type { DatabaseView } from "../model/types";
import { validateTrigger } from "./trigger";

export function validateDatabaseView(
  view: unknown,
  schemas: unknown[],
): DatabaseView {
  if (!isObject(view)) {
    throw new Error("Invalid view definition.");
  }

  // view.id obrigatório.
  validateRequiredString(view.id, "View id");

  // schemaId obrigatório e deve existir.
  validateRequiredString(view.schemaId, "View schemaId");
  
  const schemaExists = Array.isArray(schemas) && schemas.some((schema) => {
    return isObject(schema) && schema.id === view.schemaId;
  });
  if (!schemaExists) {
    throw new Error(`Schema with id "${view.schemaId}" does not exist.`);
  }

  // name obrigatório.
  validateRequiredString(view.name, "View name");
  const viewName = view.name as string;

  // definition obrigatório.
  validateRequiredString(view.definition, "View definition");

  // isMaterialized deve ser boolean.
  if (typeof view.isMaterialized !== "boolean") {
    throw new Error(`View "${view.name}" isMaterialized must be a boolean.`);
  }

  // withNoData, se informado, deve ser boolean.
  if (view.withNoData !== undefined && typeof view.withNoData !== "boolean") {
    throw new Error(`View "${view.name}" withNoData must be a boolean.`);
  }

  // Coordinates validation
  if (view.x === undefined) {
    view.x = 100;
  }
  if (view.y === undefined) {
    view.y = 100;
  }
  if (typeof view.x !== "number" || typeof view.y !== "number") {
    throw new Error(`View "${view.name}" coordinates x and y must be numbers.`);
  }

  // Initialize triggers list if not present
  if (!Array.isArray(view.triggers)) {
    view.triggers = [];
  }

  const triggers = view.triggers as unknown[];
  validateUniqueNames(
    triggers,
    `View "${view.name}" triggers`,
    (item: unknown) => (isObject(item) && typeof item.name === "string" ? item.name : ""),
  );

  triggers.forEach((trigger) => {
    validateTrigger(trigger, viewName);
  });

  return view as unknown as DatabaseView;
}
