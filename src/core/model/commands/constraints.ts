import { updateTableInProject } from "@/core/model/internal/update-helpers";
import type {
  CreateResult,
  DatabaseForeignKey,
  DatabaseForeignKeyInput,
  DatabaseIndex,
  DatabaseIndexInput,
  DatabaseProject,
  DatabaseUniqueConstraint,
  DatabaseUniqueConstraintInput,
} from "@/core/model/types";

export function createForeignKey(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  input: DatabaseForeignKeyInput,
): CreateResult {
  const id = crypto.randomUUID();
  return {
    id,
    project: updateTableInProject(project, schemaId, tableId, (table) => ({
      ...table,
      foreignKeys: [...table.foreignKeys, { id, ...input }],
    })),
  };
}

export function updateForeignKey(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  id: string,
  updater: (item: DatabaseForeignKey) => DatabaseForeignKey,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    foreignKeys: table.foreignKeys.map((item) =>
      item.id === id ? updater(item) : item,
    ),
  }));
}

export function removeForeignKey(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  id: string,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter((item) => item.id !== id),
  }));
}

export function createUniqueConstraint(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  input: DatabaseUniqueConstraintInput,
): CreateResult {
  const id = crypto.randomUUID();
  return {
    id,
    project: updateTableInProject(project, schemaId, tableId, (table) => ({
      ...table,
      uniqueConstraints: [...table.uniqueConstraints, { id, ...input }],
    })),
  };
}

export function updateUniqueConstraint(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  id: string,
  updater: (item: DatabaseUniqueConstraint) => DatabaseUniqueConstraint,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    uniqueConstraints: table.uniqueConstraints.map((item) =>
      item.id === id ? updater(item) : item,
    ),
  }));
}

export function removeUniqueConstraint(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  id: string,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    uniqueConstraints: table.uniqueConstraints.filter((item) => item.id !== id),
  }));
}

export function createIndex(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  input: DatabaseIndexInput,
): CreateResult {
  const id = crypto.randomUUID();
  return {
    id,
    project: updateTableInProject(project, schemaId, tableId, (table) => ({
      ...table,
      indexes: [...table.indexes, { id, ...input }],
    })),
  };
}

export function updateIndex(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  id: string,
  updater: (item: DatabaseIndex) => DatabaseIndex,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    indexes: table.indexes.map((item) =>
      item.id === id ? updater(item) : item,
    ),
  }));
}

export function removeIndex(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  id: string,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    indexes: table.indexes.filter((item) => item.id !== id),
  }));
}
