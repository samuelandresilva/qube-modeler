import type { DatabaseProject, DatabaseSchema, DatabaseTable, DatabaseView } from "./types";

export type TableContext = {
  schema: DatabaseSchema;
  table: DatabaseTable;
};

export type ViewContext = {
  schema: DatabaseSchema;
  view: DatabaseView;
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

export function findViewContext(
  project: DatabaseProject,
  viewId: string,
): ViewContext | undefined {
  const view = (project.views ?? []).find((candidate) => candidate.id === viewId);
  if (!view) return undefined;

  const schema = project.schemas.find((candidate) => candidate.id === view.schemaId);
  if (!schema) return undefined;

  return { schema, view };
}

