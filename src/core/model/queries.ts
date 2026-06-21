import type { DatabaseProject, DatabaseSchema, DatabaseTable } from "./types";

export type TableContext = {
  schema: DatabaseSchema;
  table: DatabaseTable;
};

export function findTableContext(
  project: DatabaseProject,
  tableId: string,
): TableContext | undefined {
  for (const schema of project.schemas) {
    const table = schema.tables.find((candidate) => candidate.id === tableId);

    if (table) {
      return { schema, table };
    }
  }

  return undefined;
}
