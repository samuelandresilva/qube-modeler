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
): CreateResult {
  const id = crypto.randomUUID();

  return {
    id,
    project: {
      ...project,
      schemas: [...project.schemas, { id, name, sequences: [], tables: [] }],
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
    schemas: nextProject.schemas.map((schema) => ({
      ...schema,
      tables: schema.tables.map(
        (table): DatabaseTable => ({
          ...table,
          foreignKeys: table.foreignKeys.map((foreignKey) =>
            foreignKey.targetSchema === currentSchema.name
              ? { ...foreignKey, targetSchema: updatedSchema.name }
              : foreignKey,
          ),
        }),
      ),
    })),
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
      .map((candidate) => ({
        ...candidate,
        tables: candidate.tables.map((table) => ({
          ...table,
          foreignKeys: table.foreignKeys.filter(
            (foreignKey) => foreignKey.targetSchema !== schema.name,
          ),
        })),
      })),
    diagram: {
      ...project.diagram,
      tableNodes: project.diagram.tableNodes.filter(
        (node) => !removedTableIds.has(node.tableId),
      ),
    },
  };
}
