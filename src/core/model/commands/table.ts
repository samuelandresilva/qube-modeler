import { updateTableInProject } from "@/core/model/internal/update-helpers";
import { findTableContext } from "@/core/model/queries";
import type {
  CreateResult,
  DatabaseProject,
  DatabaseTable,
} from "@/core/model/types";

export function createTable(
  project: DatabaseProject,
  schemaId: string,
): CreateResult {
  const schema = project.schemas.find((candidate) => candidate.id === schemaId);
  const id = crypto.randomUUID();

  if (!schema) return { project, id };

  const table: DatabaseTable = {
    id,
    name: `table_${schema.tables.length + 1}`,
    columns: [],
    foreignKeys: [],
    uniqueConstraints: [],
    indexes: [],
  };

  return {
    id,
    project: {
      ...project,
      schemas: project.schemas.map((candidate) =>
        candidate.id === schemaId
          ? { ...candidate, tables: [...candidate.tables, table] }
          : candidate,
      ),
      diagram: {
        ...project.diagram,
        tableNodes: [
          ...project.diagram.tableNodes,
          {
            tableId: id,
            position: {
              x: 120 + project.diagram.tableNodes.length * 40,
              y: 120 + project.diagram.tableNodes.length * 40,
            },
          },
        ],
      },
    },
  };
}

export function updateTable(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  updater: (table: DatabaseTable) => DatabaseTable,
): DatabaseProject {
  const context = findTableContext(project, tableId);
  if (!context || context.schema.id !== schemaId) return project;

  const updated = updater(context.table);
  const nextProject = updateTableInProject(
    project,
    schemaId,
    tableId,
    () => updated,
  );
  if (updated.name === context.table.name) return nextProject;

  return {
    ...nextProject,
    schemas: nextProject.schemas.map((schema) => ({
      ...schema,
      tables: schema.tables.map((table) => ({
        ...table,
        foreignKeys: table.foreignKeys.map((foreignKey) =>
          foreignKey.targetSchema === context.schema.name &&
          foreignKey.targetTable === context.table.name
            ? { ...foreignKey, targetTable: updated.name }
            : foreignKey,
        ),
      })),
    })),
  };
}

export function removeTable(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
): DatabaseProject {
  const context = findTableContext(project, tableId);
  if (!context || context.schema.id !== schemaId) return project;

  return {
    ...project,
    schemas: project.schemas.map((schema) => ({
      ...schema,
      tables: schema.tables
        .filter((table) => !(schema.id === schemaId && table.id === tableId))
        .map((table) => ({
          ...table,
          foreignKeys: table.foreignKeys.filter(
            (foreignKey) =>
              foreignKey.targetSchema !== context.schema.name ||
              foreignKey.targetTable !== context.table.name,
          ),
        })),
    })),
    diagram: {
      ...project.diagram,
      tableNodes: project.diagram.tableNodes.filter(
        (node) => node.tableId !== tableId,
      ),
    },
  };
}
