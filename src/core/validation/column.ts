import {
  isPostgresColumnType,
  supportsScale,
  supportsSize,
} from "@/core/sql/postgres-column-types";
import {
  isObject,
  validateRequiredString,
  validateSqlIdentifier,
} from "./primitives";

export function validateColumn(
  column: unknown,
  tableName: unknown,
  sequences: unknown[],
): void {
  if (!isObject(column))
    throw new Error(`Invalid column in table "${tableName}".`);
  validateRequiredString(column.id, `Column id in table "${tableName}"`);
  validateSqlIdentifier(column.name, `Column name in table "${tableName}"`);
  validateRequiredString(
    column.type,
    `Column type for column "${column.name}"`,
  );
  if (!isPostgresColumnType(column.type)) {
    throw new Error(
      `Column "${column.name}" type "${column.type}" is not supported.`,
    );
  }
  validateSizeAndScale(column);
  if (typeof column.nullable !== "boolean")
    throw new Error(`Column "${column.name}" nullable must be boolean.`);
  if (typeof column.primaryKey !== "boolean")
    throw new Error(`Column "${column.name}" primaryKey must be boolean.`);
  if (
    column.defaultValue !== undefined &&
    typeof column.defaultValue !== "string"
  )
    throw new Error(`Column "${column.name}" defaultValue must be string.`);
  if (
    typeof column.defaultValue === "string" &&
    /[;\n\r]/.test(column.defaultValue)
  )
    throw new Error(
      `Column "${column.name}" defaultValue cannot contain semicolon or line breaks.`,
    );
  if (
    column.sequenceName !== undefined &&
    typeof column.sequenceName !== "string"
  )
    throw new Error(`Column "${column.name}" sequenceName must be string.`);
  if (
    typeof column.sequenceName === "string" &&
    column.sequenceName.trim() !== ""
  ) {
    if (
      typeof column.defaultValue === "string" &&
      column.defaultValue.trim() !== ""
    )
      throw new Error(
        `Column "${column.name}" cannot have both sequenceName and defaultValue.`,
      );
    const exists = sequences.some(
      (sequence) => isObject(sequence) && sequence.name === column.sequenceName,
    );
    if (!exists)
      throw new Error(
        `Column "${column.name}" references missing sequence "${column.sequenceName}".`,
      );
  }
}

function validateSizeAndScale(column: Record<string, unknown>): void {
  const name = column.name as string;
  const type = column.type as string;
  if (supportsSize(type)) {
    if (!Number.isInteger(column.size) || (column.size as number) <= 0)
      throw new Error(`Column "${name}" size must be a positive integer.`);
  } else if (column.size !== undefined)
    throw new Error(`Column "${name}" type "${type}" does not support size.`);
  if (supportsScale(type)) {
    if (!Number.isInteger(column.scale) || (column.scale as number) < 0)
      throw new Error(
        `Column "${name}" scale must be zero or a positive integer.`,
      );
    if (
      typeof column.size === "number" &&
      (column.scale as number) > column.size
    )
      throw new Error(`Column "${name}" scale cannot be greater than size.`);
  } else if (column.scale !== undefined)
    throw new Error(`Column "${name}" type "${type}" does not support scale.`);
}
