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
    schemas: project.schemas.map((schema) => {
      let schemaChanged = false;
      const tables = schema.tables.map((table): DatabaseTable => {
        const isSource = schema.id === schemaId && table.id === tableId;
        const columns = isSource
          ? table.columns.map((column) =>
              column.id === columnId ? updated : column,
            )
          : table.columns;

        const tableChanged = isSource;

        if (!nameChanged) {
          if (tableChanged) {
            schemaChanged = true;
            return { ...table, columns };
          }
          return table;
        }

        let ucChanged = false;
        const uniqueConstraints = table.uniqueConstraints.map((constraint) => {
          let uChanged = false;
          const mappedColumns = constraint.columns.map((name) => {
            if (isSource && name === current.name) {
              uChanged = true;
              return updated.name;
            }
            return name;
          });
          if (uChanged) {
            ucChanged = true;
            return { ...constraint, columns: mappedColumns };
          }
          return constraint;
        });

        let idxChanged = false;
        const indexes = table.indexes.map((index) => {
          let iChanged = false;
          const mappedColumns = index.columns.map((name) => {
            if (isSource && name === current.name) {
              iChanged = true;
              return updated.name;
            }
            return name;
          });
          if (iChanged) {
            idxChanged = true;
            return { ...index, columns: mappedColumns };
          }
          return index;
        });

        let fkChanged = false;
        const foreignKeys = table.foreignKeys.map((foreignKey) => {
          let fChanged = false;
          const sourceColumns = isSource
            ? foreignKey.sourceColumns.map((name) => {
                if (name === current.name) {
                  fChanged = true;
                  return updated.name;
                }
                return name;
              })
            : foreignKey.sourceColumns;

          const targetColumns =
            foreignKey.targetSchema === context.schema.name &&
            foreignKey.targetTable === context.table.name
              ? foreignKey.targetColumns.map((name) => {
                  if (name === current.name) {
                    fChanged = true;
                    return updated.name;
                  }
                  return name;
                })
              : foreignKey.targetColumns;

          if (fChanged) {
            fkChanged = true;
            return { ...foreignKey, sourceColumns, targetColumns };
          }
          return foreignKey;
        });

        if (tableChanged || ucChanged || idxChanged || fkChanged) {
          schemaChanged = true;
          return {
            ...table,
            columns,
            uniqueConstraints,
            indexes,
            foreignKeys,
          };
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
    schemas: project.schemas.map((schema) => {
      let schemaChanged = false;
      const tables = schema.tables.map((table) => {
        const isSource = schema.id === schemaId && table.id === tableId;
        const filteredColumns = isSource
          ? table.columns.filter((column) => column.id !== columnId)
          : table.columns;

        let tableChanged = filteredColumns.length !== table.columns.length;

        const filteredUniqueConstraints = table.uniqueConstraints.filter(
          (constraint) => !constraint.columns.includes(removed.name),
        );
        if (filteredUniqueConstraints.length !== table.uniqueConstraints.length) {
          tableChanged = true;
        }

        const filteredIndexes = table.indexes.filter(
          (index) => !index.columns.includes(removed.name),
        );
        if (filteredIndexes.length !== table.indexes.length) {
          tableChanged = true;
        }

        const filteredForeignKeys = table.foreignKeys.filter((foreignKey) => {
          const sourceUse =
            isSource && foreignKey.sourceColumns.includes(removed.name);
          const targetUse =
            foreignKey.targetSchema === context.schema.name &&
            foreignKey.targetTable === context.table.name &&
            foreignKey.targetColumns.includes(removed.name);
          return !sourceUse && !targetUse;
        });
        if (filteredForeignKeys.length !== table.foreignKeys.length) {
          tableChanged = true;
        }

        if (tableChanged) {
          schemaChanged = true;
          return {
            ...table,
            columns: filteredColumns,
            uniqueConstraints: filteredUniqueConstraints,
            indexes: filteredIndexes,
            foreignKeys: filteredForeignKeys,
          };
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
