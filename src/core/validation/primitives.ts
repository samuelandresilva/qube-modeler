import {
  isPostgresReservedWord,
  isValidSqlIdentifier,
} from "@/core/sql/postgres-identifiers";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateRequiredString(
  value: unknown,
  fieldName: string,
): void {
  if (typeof value !== "string") throw new Error(`${fieldName} is required.`);
  if (value.trim() === "") throw new Error(`${fieldName} cannot be empty.`);
}

export function validateRequiredNumber(
  value: unknown,
  fieldName: string,
): void {
  if (typeof value !== "number") throw new Error(`${fieldName} is required.`);
  if (!Number.isFinite(value))
    throw new Error(`${fieldName} must be a valid number.`);
}

export function validateSqlIdentifier(value: unknown, fieldName: string): void {
  validateRequiredString(value, fieldName);
  const identifier = value as string;
  if (!isValidSqlIdentifier(identifier)) {
    throw new Error(
      `${fieldName} must start with a letter or underscore and contain only letters, numbers, and underscores.`,
    );
  }
  if (isPostgresReservedWord(identifier)) {
    throw new Error(`${fieldName} cannot be a PostgreSQL reserved word.`);
  }
}

export function validateUniqueNames(
  items: unknown[],
  contextName: string,
  getName: (item: Record<string, unknown>) => unknown,
): void {
  const names = new Set<string>();
  for (const item of items) {
    if (!isObject(item)) continue;
    const name = getName(item);
    if (typeof name !== "string" || name.trim() === "") continue;
    if (names.has(name.trim())) {
      throw new Error(`${contextName} has duplicated name "${name.trim()}".`);
    }
    names.add(name.trim());
  }
}

export function validateNoDuplicateDefinitions(
  items: unknown[],
  contextName: string,
  keyOf: (item: Record<string, unknown>) => string | undefined,
): void {
  const definitions = new Set<string>();
  for (const item of items) {
    if (!isObject(item)) continue;
    const key = keyOf(item);
    if (key === undefined) continue;
    if (definitions.has(key))
      throw new Error(`${contextName} has duplicated definition.`);
    definitions.add(key);
  }
}
