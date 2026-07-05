import { validateColumn } from "./column";
import {
  validateNamedColumnList,
  validateNoDuplicateColumnLists,
  validateCheckConstraint,
} from "./constraints";
import { validateForeignKey } from "./foreign-key";
import {
  isObject,
  validateNoDuplicateDefinitions,
  validateRequiredString,
  validateSqlIdentifier,
  validateUniqueNames,
} from "./primitives";

export function validateTable(
  table: unknown,
  schemaName: unknown,
  sequences: unknown[],
  projectSchemas: unknown[],
): void {
  if (!isObject(table))
    throw new Error(`Invalid table in schema "${schemaName}".`);
  validateRequiredString(table.id, `Table id in schema "${schemaName}"`);
  validateSqlIdentifier(table.name, `Table name in schema "${schemaName}"`);

  if (!Array.isArray(table.checkConstraints)) {
    table.checkConstraints = [];
  }

  const columns = requireArray(
    table.columns,
    `Table "${table.name}" columns are required.`,
  );
  const foreignKeys = requireArray(
    table.foreignKeys,
    `Table "${table.name}" foreignKeys are required.`,
  );
  const uniqueConstraints = requireArray(
    table.uniqueConstraints,
    `Table "${table.name}" uniqueConstraints are required.`,
  );
  const indexes = requireArray(
    table.indexes,
    `Table "${table.name}" indexes are required.`,
  );
  const checkConstraints = requireArray(
    table.checkConstraints,
    `Table "${table.name}" checkConstraints are required.`,
  );

  validateUniqueNames(
    columns,
    `Table "${table.name}" columns`,
    (item) => item.name,
  );
  validateUniqueNames(
    foreignKeys,
    `Table "${table.name}" foreign keys`,
    (item) => item.name,
  );
  validateUniqueNames(
    uniqueConstraints,
    `Table "${table.name}" unique constraints`,
    (item) => item.name,
  );
  validateUniqueNames(
    indexes,
    `Table "${table.name}" indexes`,
    (item) => item.name,
  );
  validateUniqueNames(
    checkConstraints,
    `Table "${table.name}" check constraints`,
    (item) => item.name,
  );
  validateNoDuplicateDefinitions(
    foreignKeys,
    `Table "${table.name}" foreign keys`,
    (item) => {
      if (
        !Array.isArray(item.sourceColumns) ||
        !Array.isArray(item.targetColumns)
      )
        return undefined;
      return [
        item.sourceColumns.join(","),
        item.targetSchema,
        item.targetTable,
        item.targetColumns.join(","),
      ].join("|");
    },
  );
  validateNoDuplicateColumnLists(
    uniqueConstraints,
    `Table "${table.name}" unique constraints`,
  );
  validateNoDuplicateColumnLists(indexes, `Table "${table.name}" indexes`);

  columns.forEach((column) => validateColumn(column, table.name, sequences));
  foreignKeys.forEach((foreignKey) =>
    validateForeignKey(foreignKey, table, projectSchemas),
  );
  uniqueConstraints.forEach((item) =>
    validateNamedColumnList(item, table, "Unique constraint"),
  );
  indexes.forEach((item) => validateNamedColumnList(item, table, "Index"));
  checkConstraints.forEach((item) => validateCheckConstraint(item, table));
}

function requireArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}
