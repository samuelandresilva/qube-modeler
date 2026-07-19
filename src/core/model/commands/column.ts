import { updateTableInProject } from "@/core/model/internal/update-helpers";
import { findTableContext } from "@/core/model/queries";
import type {
  CreateResult,
  DatabaseColumn,
  DatabaseColumnInput,
  DatabaseProject,
  DatabaseTable,
} from "@/core/model/types";

export function createColumn(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  input: DatabaseColumnInput,
): CreateResult {
  const id = crypto.randomUUID();
  return {
    id,
    project: updateTableInProject(project, schemaId, tableId, (table) => ({
      ...table,
      columns: [...table.columns, { id, ...input }],
    })),
  };
}

export function updateColumn(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  columnId: string,
  updater: (column: DatabaseColumn) => DatabaseColumn,
): DatabaseProject {
  const context = findTableContext(project, tableId);
  const current = context?.table.columns.find(
    (column) => column.id === columnId,
  );
  if (!context || context.schema.id !== schemaId || !current) return project;

  const updated = updater(current);
  const nameChanged = current.name !== updated.name;

  return {
    ...project,
    schemas: project.schemas.map((schema) => ({
      ...schema,
      tables: schema.tables.map((table): DatabaseTable => {
        const isSource = schema.id === schemaId && table.id === tableId;
        const columns = isSource
          ? table.columns.map((column) =>
              column.id === columnId ? updated : column,
            )
          : table.columns;

        if (!nameChanged) return { ...table, columns };

        return {
          ...table,
          columns,
          uniqueConstraints: table.uniqueConstraints.map((constraint) => ({
            ...constraint,
            columns: constraint.columns.map((name) =>
              isSource && name === current.name ? updated.name : name,
            ),
          })),
          indexes: table.indexes.map((index) => ({
            ...index,
            columns: index.columns.map((name) =>
              isSource && name === current.name ? updated.name : name,
            ),
          })),
          foreignKeys: table.foreignKeys.map((foreignKey) => ({
            ...foreignKey,
            sourceColumns: isSource
              ? foreignKey.sourceColumns.map((name) =>
                  name === current.name ? updated.name : name,
                )
              : foreignKey.sourceColumns,
            targetColumns:
              foreignKey.targetSchema === context.schema.name &&
              foreignKey.targetTable === context.table.name
                ? foreignKey.targetColumns.map((name) =>
                    name === current.name ? updated.name : name,
                  )
                : foreignKey.targetColumns,
          })),
        };
      }),
    })),
  };
}

export function removeColumn(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  columnId: string,
): DatabaseProject {
  const context = findTableContext(project, tableId);
  const removed = context?.table.columns.find(
    (column) => column.id === columnId,
  );
  if (!context || context.schema.id !== schemaId || !removed) return project;

  return {
    ...project,
    schemas: project.schemas.map((schema) => ({
      ...schema,
      tables: schema.tables.map((table) => {
        const isSource = schema.id === schemaId && table.id === tableId;
        return {
          ...table,
          columns: isSource
            ? table.columns.filter((column) => column.id !== columnId)
            : table.columns,
          uniqueConstraints: table.uniqueConstraints.filter(
            (constraint) => !constraint.columns.includes(removed.name),
          ),
          indexes: table.indexes.filter(
            (index) => !index.columns.includes(removed.name),
          ),
          foreignKeys: table.foreignKeys.filter((foreignKey) => {
            const sourceUse =
              isSource && foreignKey.sourceColumns.includes(removed.name);
            const targetUse =
              foreignKey.targetSchema === context.schema.name &&
              foreignKey.targetTable === context.table.name &&
              foreignKey.targetColumns.includes(removed.name);
            return !sourceUse && !targetUse;
          }),
        };
      }),
    })),
  };
}

export function moveColumn(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  columnId: string,
  direction: "up" | "down",
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => {
    const index = table.columns.findIndex((col) => col.id === columnId);
    if (index === -1) return table;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= table.columns.length) return table;

    const updatedColumns = [...table.columns];
    const temp = updatedColumns[index];
    updatedColumns[index] = updatedColumns[targetIndex];
    updatedColumns[targetIndex] = temp;

    return {
      ...table,
      columns: updatedColumns,
    };
  });
}
