import { updateSchemaInProject } from "@/core/model/internal/update-helpers";
import type {
  CreateResult,
  DatabaseProject,
  DatabaseSequence,
  DatabaseSequenceInput,
} from "@/core/model/types";

export function createSequence(
  project: DatabaseProject,
  schemaId: string,
  input: DatabaseSequenceInput,
): CreateResult {
  const id = crypto.randomUUID();

  return {
    id,
    project: updateSchemaInProject(project, schemaId, (schema) => ({
      ...schema,
      sequences: [...schema.sequences, { id, ...input }],
    })),
  };
}

export function updateSequence(
  project: DatabaseProject,
  schemaId: string,
  sequenceId: string,
  updater: (sequence: DatabaseSequence) => DatabaseSequence,
): DatabaseProject {
  return updateSchemaInProject(project, schemaId, (schema) => {
    const current = schema.sequences.find(
      (sequence) => sequence.id === sequenceId,
    );
    if (!current) return schema;

    const updated = updater(current);
    return {
      ...schema,
      sequences: schema.sequences.map((sequence) =>
        sequence.id === sequenceId ? updated : sequence,
      ),
      tables:
        current.name === updated.name
          ? schema.tables
          : schema.tables.map((table) => ({
              ...table,
              columns: table.columns.map((column) =>
                column.sequenceName === current.name
                  ? { ...column, sequenceName: updated.name }
                  : column,
              ),
            })),
    };
  });
}

export function removeSequence(
  project: DatabaseProject,
  schemaId: string,
  sequenceId: string,
): DatabaseProject {
  return updateSchemaInProject(project, schemaId, (schema) => {
    const removed = schema.sequences.find(
      (sequence) => sequence.id === sequenceId,
    );
    if (!removed) return schema;

    return {
      ...schema,
      sequences: schema.sequences.filter(
        (sequence) => sequence.id !== sequenceId,
      ),
      tables: schema.tables.map((table) => ({
        ...table,
        columns: table.columns.map((column) =>
          column.sequenceName === removed.name
            ? { ...column, sequenceName: undefined }
            : column,
        ),
      })),
    };
  });
}
