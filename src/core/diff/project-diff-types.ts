export type ProjectDiff = {
  operations: ProjectDiffOperation[];
  unsupportedOperations: UnsupportedDiffOperation[];
};

export type ProjectDiffOperation =
  | CreateSchemaDiffOperation
  | CreateSequenceDiffOperation
  | CreateTableDiffOperation
  | AddColumnDiffOperation
  | AddPrimaryKeyDiffOperation
  | AddForeignKeyDiffOperation
  | AddUniqueConstraintDiffOperation
  | AddIndexDiffOperation;

export type CreateSchemaDiffOperation = {
  kind: "CREATE_SCHEMA";
  schemaId: string;
  schemaName: string;
};

export type CreateSequenceDiffOperation = {
  kind: "CREATE_SEQUENCE";
  schemaId: string;
  schemaName: string;
  sequenceId: string;
  sequenceName: string;
};

export type CreateTableDiffOperation = {
  kind: "CREATE_TABLE";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
};

export type AddColumnDiffOperation = {
  kind: "ADD_COLUMN";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
};

export type AddPrimaryKeyDiffOperation = {
  kind: "ADD_PRIMARY_KEY";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnIds: string[];
  columnNames: string[];
};

export type AddForeignKeyDiffOperation = {
  kind: "ADD_FOREIGN_KEY";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  foreignKeyId: string;
  foreignKeyName: string;
};

export type AddUniqueConstraintDiffOperation = {
  kind: "ADD_UNIQUE_CONSTRAINT";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  uniqueConstraintId: string;
  uniqueConstraintName: string;
};

export type AddIndexDiffOperation = {
  kind: "ADD_INDEX";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  indexId: string;
  indexName: string;
};

export type UnsupportedDiffOperation = {
  kind: "UNSUPPORTED";
  reason: string;
  objectType: string;
  objectName: string;
};
