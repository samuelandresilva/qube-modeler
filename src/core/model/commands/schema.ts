import { updateSchemaInProject } from "@/core/model/internal/update-helpers";
import type {
  CreateResult,
  DatabaseProject,
  DatabaseSchema,
  DatabaseTable,
} from "@/core/model/types";

export function createSchema(
  project: DatabaseProject,
  name: string,
  comment?: string,
): CreateResult {
  const id = crypto.randomUUID();

  return {
    id,
    project: {
      ...project,
      schemas: [...project.schemas, { id, name, sequences: [], tables: [], comment }],
    },
  };
}

export function updateSchema(
  project: DatabaseProject,
  schemaId: string,
  updater: (schema: DatabaseSchema) => DatabaseSchema,
): DatabaseProject {
  const currentSchema = project.schemas.find(
    (schema) => schema.id === schemaId,
  );

  if (!currentSchema) return project;

  const updatedSchema = updater(currentSchema);
  const nextProject = updateSchemaInProject(
    project,
    schemaId,
    () => updatedSchema,
  );

  if (currentSchema.name === updatedSchema.name) return nextProject;

  return {
    ...nextProject,
    schemas: nextProject.schemas.map((schema) => {
      let schemaChanged = false;
      const tables = schema.tables.map((table): DatabaseTable => {
        let tableChanged = false;
        const foreignKeys = table.foreignKeys.map((foreignKey) => {
          if (foreignKey.targetSchema === currentSchema.name) {
            tableChanged = true;
            return { ...foreignKey, targetSchema: updatedSchema.name };
          }
          return foreignKey;
        });

        if (tableChanged) {
          schemaChanged = true;
          return { ...table, foreignKeys };
        }
        return table;
      });

      if (schemaChanged) {
        return { ...schema, tables };
      }
      return schema;
    }),
  };
}

export function removeSchema(
  project: DatabaseProject,
  schemaId: string,
): DatabaseProject {
  const schema = project.schemas.find((candidate) => candidate.id === schemaId);
  if (!schema) return project;

  const removedTableIds = new Set(schema.tables.map((table) => table.id));

  return {
    ...project,
    schemas: project.schemas
      .filter((candidate) => candidate.id !== schemaId)
      .map((candidate) => {
        let schemaChanged = false;
        const tables = candidate.tables.map((table) => {
          const filteredFks = table.foreignKeys.filter(
            (foreignKey) => foreignKey.targetSchema !== schema.name,
          );

          if (filteredFks.length !== table.foreignKeys.length) {
            schemaChanged = true;
            return { ...table, foreignKeys: filteredFks };
          }
          return table;
        });

        if (schemaChanged) {
          return { ...candidate, tables };
        }
        return candidate;
      }),
    diagram: {
      ...project.diagram,
      tableNodes: project.diagram.tableNodes.filter(
        (node) => !removedTableIds.has(node.tableId),
      ),
    },
  };
}
