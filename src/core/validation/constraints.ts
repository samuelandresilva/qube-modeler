import {
  isObject,
  validateNoDuplicateDefinitions,
  validateRequiredString,
  validateSqlIdentifier,
} from "./primitives";

type NamedColumnListKind = "Index" | "Unique constraint";

export function validateNamedColumnList(
  item: unknown,
  table: Record<string, unknown>,
  kind: NamedColumnListKind,
): void {
  if (!isObject(item))
    throw new Error(`Invalid ${kind.toLowerCase()} in table "${table.name}".`);
  validateRequiredString(item.id, `${kind} id in table "${table.name}"`);
  validateSqlIdentifier(item.name, `${kind} name in table "${table.name}"`);
  if (!Array.isArray(item.columns) || item.columns.length === 0) {
    throw new Error(`${kind} "${item.name}" must have at least one column.`);
  }
  if (!Array.isArray(table.columns))
    throw new Error(`Table "${table.name}" columns are required.`);
  for (const columnName of item.columns) {
    validateSqlIdentifier(columnName, `${kind} "${item.name}" column`);
    const exists = table.columns.some(
      (column) => isObject(column) && column.name === columnName,
    );
    if (!exists)
      throw new Error(
        `${kind} "${item.name}" references missing column "${columnName}" in table "${table.name}".`,
      );
  }
}

export function validateNoDuplicateColumnLists(
  items: unknown[],
  context: string,
): void {
  validateNoDuplicateDefinitions(items, context, (item) =>
    Array.isArray(item.columns) ? item.columns.join(",") : undefined,
  );
}
