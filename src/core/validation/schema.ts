import type { DatabaseSchema } from "@/core/model";
import {
  isObject,
  validateRequiredNumber,
  validateRequiredString,
  validateSqlIdentifier,
  validateUniqueNames,
} from "./primitives";
import { validateTable } from "./table";

export function validateSchema(
  schema: unknown,
  projectSchemas: unknown[],
): DatabaseSchema {
  if (!isObject(schema)) throw new Error("Invalid schema.");
  validateRequiredString(schema.id, "Schema id");
  validateSqlIdentifier(schema.name, "Schema name");
  if (!Array.isArray(schema.sequences))
    throw new Error(`Schema "${schema.name}" sequences are required.`);
  if (!Array.isArray(schema.tables))
    throw new Error(`Schema "${schema.name}" tables are required.`);
  validateUniqueNames(
    schema.sequences,
    `Schema "${schema.name}" sequences`,
    (item) => item.name,
  );
  validateUniqueNames(
    schema.tables,
    `Schema "${schema.name}" tables`,
    (item) => item.name,
  );
  schema.sequences.forEach((sequence) =>
    validateSequence(sequence, schema.name),
  );
  const tables = schema.tables.map((table) =>
    validateTable(
      table,
      schema.name,
      schema.sequences as unknown[],
      projectSchemas,
    ),
  );

  return {
    ...schema,
    tables,
  } as unknown as DatabaseSchema;
}

function validateSequence(sequence: unknown, schemaName: unknown): void {
  if (!isObject(sequence))
    throw new Error(`Invalid sequence in schema "${schemaName}".`);
  validateRequiredString(sequence.id, `Sequence id in schema "${schemaName}"`);
  validateSqlIdentifier(
    sequence.name,
    `Sequence name in schema "${schemaName}"`,
  );
  validateRequiredNumber(
    sequence.startWith,
    `Sequence "${sequence.name}" startWith`,
  );
  validateRequiredNumber(
    sequence.incrementBy,
    `Sequence "${sequence.name}" incrementBy`,
  );
  if (sequence.incrementBy === 0)
    throw new Error(`Sequence "${sequence.name}" incrementBy cannot be zero.`);
}
