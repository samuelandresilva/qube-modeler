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
  position?: { x: number; y: number },
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
    checkConstraints: [],
    triggers: [],
  };

  const finalPosition = position ?? {
    x: 120 + project.diagram.tableNodes.length * 40,
    y: 120 + project.diagram.tableNodes.length * 40,
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
            position: finalPosition,
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
    schemas: nextProject.schemas.map((schema) => {
      let schemaChanged = false;
      const tables = schema.tables.map((table) => {
        let tableChanged = false;
        const foreignKeys = table.foreignKeys.map((foreignKey) => {
          if (
            foreignKey.targetSchema === context.schema.name &&
            foreignKey.targetTable === context.table.name
          ) {
            tableChanged = true;
            return { ...foreignKey, targetTable: updated.name };
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

export function removeTable(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
): DatabaseProject {
  const context = findTableContext(project, tableId);
  if (!context || context.schema.id !== schemaId) return project;

  return {
    ...project,
    schemas: project.schemas.map((schema) => {
      const isTargetSchema = schema.id === schemaId;
      const filteredTables = isTargetSchema
        ? schema.tables.filter((table) => table.id !== tableId)
        : schema.tables;

      let schemaChanged = isTargetSchema;

      const tables = filteredTables.map((table) => {
        const filteredFks = table.foreignKeys.filter(
          (foreignKey) =>
            foreignKey.targetSchema !== context.schema.name ||
            foreignKey.targetTable !== context.table.name,
        );

        if (filteredFks.length !== table.foreignKeys.length) {
          schemaChanged = true;
          return { ...table, foreignKeys: filteredFks };
        }
        return table;
      });

      if (schemaChanged) {
        return { ...schema, tables };
      }
      return schema;
    }),
    diagram: {
      ...project.diagram,
      tableNodes: project.diagram.tableNodes.filter(
        (node) => node.tableId !== tableId,
      ),
    },
  };
}

export function moveTableSchema(
  project: DatabaseProject,
  tableId: string,
  targetSchemaId: string,
): DatabaseProject {
  const context = findTableContext(project, tableId);
  if (!context || context.schema.id === targetSchemaId) return project;

  const targetSchema = project.schemas.find((s) => s.id === targetSchemaId);
  if (!targetSchema) return project;

  const oldSchemaName = context.schema.name;
  const newSchemaName = targetSchema.name;

  const schemasAfterRemoval = project.schemas.map((s) => {
    if (s.id === context.schema.id) {
      return {
        ...s,
        tables: s.tables.filter((t) => t.id !== tableId),
      };
    }
    return s;
  });

  const schemasAfterMove = schemasAfterRemoval.map((s) => {
    const isTargetSchema = s.id === targetSchemaId;
    let updatedTables = s.tables;
    if (isTargetSchema) {
      updatedTables = [...updatedTables, context.table];
    }

    let schemaChanged = isTargetSchema;

    if (oldSchemaName !== newSchemaName) {
      const mappedTables = updatedTables.map((t) => {
        let tableChanged = false;
        const foreignKeys = t.foreignKeys.map((fk) => {
          if (fk.targetSchema === oldSchemaName && fk.targetTable === context.table.name) {
            tableChanged = true;
            return { ...fk, targetSchema: newSchemaName };
          }
          return fk;
        });

        if (tableChanged) {
          schemaChanged = true;
          return { ...t, foreignKeys };
        }
        return t;
      });
      updatedTables = mappedTables;
    }

    if (schemaChanged) {
      return {
        ...s,
        tables: updatedTables,
      };
    }
    return s;
  });

  return {
    ...project,
    schemas: schemasAfterMove,
  };
}
