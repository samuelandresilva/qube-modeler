import type {
  DatabaseProject,
  DatabaseSchema,
  DatabaseTable,
} from "@/core/model/types";

export function updateSchemaInProject(
  project: DatabaseProject,
  schemaId: string,
  updater: (schema: DatabaseSchema) => DatabaseSchema,
): DatabaseProject {
  return {
    ...project,
    schemas: project.schemas.map((schema) =>
      schema.id === schemaId ? updater(schema) : schema,
    ),
  };
}

export function updateTableInProject(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  updater: (table: DatabaseTable) => DatabaseTable,
): DatabaseProject {
  return updateSchemaInProject(project, schemaId, (schema) => ({
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId ? updater(table) : table,
    ),
  }));
}
