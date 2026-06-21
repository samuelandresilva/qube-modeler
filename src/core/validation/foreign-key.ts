import { FOREIGN_KEY_ACTIONS } from "@/core/model";
import {
  isObject,
  validateRequiredString,
  validateSqlIdentifier,
} from "./primitives";

export function validateForeignKey(
  foreignKey: unknown,
  sourceTable: Record<string, unknown>,
  projectSchemas: unknown[],
): void {
  if (!isObject(foreignKey))
    throw new Error(`Invalid foreign key in table "${sourceTable.name}".`);
  validateRequiredString(
    foreignKey.id,
    `Foreign key id in table "${sourceTable.name}"`,
  );
  validateSqlIdentifier(
    foreignKey.name,
    `Foreign key name in table "${sourceTable.name}"`,
  );
  validateColumnArray(
    foreignKey.sourceColumns,
    foreignKey.name,
    "source",
    sourceTable,
  );
  validateSqlIdentifier(
    foreignKey.targetSchema,
    `Foreign key "${foreignKey.name}" targetSchema`,
  );
  validateSqlIdentifier(
    foreignKey.targetTable,
    `Foreign key "${foreignKey.name}" targetTable`,
  );

  const targetSchema = projectSchemas.find(
    (schema) => isObject(schema) && schema.name === foreignKey.targetSchema,
  );
  if (!isObject(targetSchema) || !Array.isArray(targetSchema.tables))
    throw new Error(
      `Foreign key "${foreignKey.name}" references missing target schema "${foreignKey.targetSchema}".`,
    );
  const targetTable = targetSchema.tables.find(
    (table) => isObject(table) && table.name === foreignKey.targetTable,
  );
  if (!isObject(targetTable))
    throw new Error(
      `Foreign key "${foreignKey.name}" references missing target table "${foreignKey.targetSchema}.${foreignKey.targetTable}".`,
    );
  validateColumnArray(
    foreignKey.targetColumns,
    foreignKey.name,
    "target",
    targetTable,
  );

  if (
    (foreignKey.sourceColumns as unknown[]).length !==
    (foreignKey.targetColumns as unknown[]).length
  ) {
    throw new Error(
      `Foreign key "${foreignKey.name}" must have the same number of source and target columns.`,
    );
  }
  validateAction(
    foreignKey.onUpdate,
    `Foreign key "${foreignKey.name}" onUpdate`,
  );
  validateAction(
    foreignKey.onDelete,
    `Foreign key "${foreignKey.name}" onDelete`,
  );
}

function validateColumnArray(
  value: unknown,
  name: unknown,
  side: "source" | "target",
  table: Record<string, unknown>,
): void {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(
      `Foreign key "${name}" must have at least one ${side} column.`,
    );
  if (!Array.isArray(table.columns))
    throw new Error(`Table "${table.name}" columns are required.`);
  for (const columnName of value) {
    validateSqlIdentifier(columnName, `Foreign key "${name}" ${side} column`);
    if (
      !table.columns.some(
        (column) => isObject(column) && column.name === columnName,
      )
    ) {
      throw new Error(
        `Foreign key "${name}" references missing ${side} column "${columnName}" in table "${table.name}".`,
      );
    }
  }
}

function validateAction(value: unknown, fieldName: string): void {
  if (value === undefined) return;
  if (
    typeof value !== "string" ||
    !FOREIGN_KEY_ACTIONS.some((action) => action === value)
  ) {
    throw new Error(
      `${fieldName} must be one of: ${FOREIGN_KEY_ACTIONS.join(", ")}.`,
    );
  }
}
