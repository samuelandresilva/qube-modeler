import type { DatabaseFunctionArgument } from "@/core/model";

export type DiffOperationRisk = "safe" | "warning" | "destructive" | "unsupported";

export type ProjectDiff = {
  operations: ProjectDiffOperation[];
  unsupportedOperations: UnsupportedDiffOperation[];
};

export type ProjectDiffOperation =
  // New operations
  | AddFunctionDiffOperation
  | DropFunctionDiffOperation
  | AlterFunctionDiffOperation
  // Existing operations
  | CreateSchemaDiffOperation
  | CreateSequenceDiffOperation
  | CreateTableDiffOperation
  | AddColumnDiffOperation
  | AddPrimaryKeyDiffOperation
  | AddForeignKeyDiffOperation
  | AddUniqueConstraintDiffOperation
  | AddIndexDiffOperation
  | AlterSequenceDiffOperation
  // Renames
  | RenameSchemaDiffOperation
  | RenameSequenceDiffOperation
  | RenameTableDiffOperation
  | RenameColumnDiffOperation
  | RenamePrimaryKeyDiffOperation
  | RenameForeignKeyDiffOperation
  | RenameUniqueConstraintDiffOperation
  | RenameIndexDiffOperation
  // Table schema alteration
  | AlterTableSchemaDiffOperation
  // Column alterations
  | AlterColumnTypeDiffOperation
  | AlterColumnSizeDiffOperation
  | AlterColumnNullabilityDiffOperation
  | AlterColumnDefaultDiffOperation
  // Constraint / Index alterations
  | AlterPrimaryKeyDiffOperation
  | AlterForeignKeyDiffOperation
  | AlterUniqueConstraintDiffOperation
  | AlterIndexDiffOperation
  // Destructive drops
  | DropSchemaDiffOperation
  | DropSequenceDiffOperation
  | DropTableDiffOperation
  | DropColumnDiffOperation
  | DropPrimaryKeyDiffOperation
  | DropForeignKeyDiffOperation
  | DropUniqueConstraintDiffOperation
  | DropIndexDiffOperation
  | AddCheckConstraintDiffOperation
  | DropCheckConstraintDiffOperation
  | AlterCheckConstraintDiffOperation
  | AddTriggerDiffOperation
  | DropTriggerDiffOperation
  | AlterTriggerDiffOperation
  | AddViewDiffOperation
  | DropViewDiffOperation
  | AlterViewDiffOperation;

// Existing operations
export type CreateSchemaDiffOperation = {
  kind: "CREATE_SCHEMA";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
};

export type CreateSequenceDiffOperation = {
  kind: "CREATE_SEQUENCE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  sequenceId: string;
  sequenceName: string;
};

export type CreateTableDiffOperation = {
  kind: "CREATE_TABLE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
};

export type AddColumnDiffOperation = {
  kind: "ADD_COLUMN";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
};

export type AddPrimaryKeyDiffOperation = {
  kind: "ADD_PRIMARY_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnIds: string[];
  columnNames: string[];
};

export type AddForeignKeyDiffOperation = {
  kind: "ADD_FOREIGN_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  foreignKeyId: string;
  foreignKeyName: string;
};

export type AddUniqueConstraintDiffOperation = {
  kind: "ADD_UNIQUE_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  uniqueConstraintId: string;
  uniqueConstraintName: string;
};

export type AddIndexDiffOperation = {
  kind: "ADD_INDEX";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  indexId: string;
  indexName: string;
};

export type AlterSequenceDiffOperation = {
  kind: "ALTER_SEQUENCE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  sequenceId: string;
  sequenceName: string;
  oldStartWith: number;
  newStartWith: number;
  oldIncrementBy: number;
  newIncrementBy: number;
};

// Renames
export type RenameSchemaDiffOperation = {
  kind: "RENAME_SCHEMA";
  risk: DiffOperationRisk;
  schemaId: string;
  oldName: string;
  newName: string;
};

export type RenameSequenceDiffOperation = {
  kind: "RENAME_SEQUENCE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  sequenceId: string;
  oldName: string;
  newName: string;
};

export type RenameTableDiffOperation = {
  kind: "RENAME_TABLE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  oldName: string;
  newName: string;
};

export type RenameColumnDiffOperation = {
  kind: "RENAME_COLUMN";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  oldName: string;
  newName: string;
};

export type RenamePrimaryKeyDiffOperation = {
  kind: "RENAME_PRIMARY_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  oldName: string;
  newName: string;
};

export type RenameForeignKeyDiffOperation = {
  kind: "RENAME_FOREIGN_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  foreignKeyId: string;
  oldName: string;
  newName: string;
};

export type RenameUniqueConstraintDiffOperation = {
  kind: "RENAME_UNIQUE_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  uniqueConstraintId: string;
  oldName: string;
  newName: string;
};

export type RenameIndexDiffOperation = {
  kind: "RENAME_INDEX";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  indexId: string;
  oldName: string;
  newName: string;
};

// Column alterations
export type AlterColumnTypeDiffOperation = {
  kind: "ALTER_COLUMN_TYPE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
  oldType: string;
  newType: string;
};

export type AlterColumnSizeDiffOperation = {
  kind: "ALTER_COLUMN_SIZE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
  oldSize?: number;
  newSize?: number;
  oldScale?: number;
  newScale?: number;
};

export type AlterColumnNullabilityDiffOperation = {
  kind: "ALTER_COLUMN_NULLABILITY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
  oldNullable: boolean;
  newNullable: boolean;
};

export type AlterColumnDefaultDiffOperation = {
  kind: "ALTER_COLUMN_DEFAULT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
  oldDefault?: string;
  newDefault?: string;
};

// Destructive drops
export type DropSchemaDiffOperation = {
  kind: "DROP_SCHEMA";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
};

export type DropSequenceDiffOperation = {
  kind: "DROP_SEQUENCE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  sequenceId: string;
  sequenceName: string;
};

export type DropTableDiffOperation = {
  kind: "DROP_TABLE";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
};

export type DropColumnDiffOperation = {
  kind: "DROP_COLUMN";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
};

export type DropPrimaryKeyDiffOperation = {
  kind: "DROP_PRIMARY_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
};

export type DropForeignKeyDiffOperation = {
  kind: "DROP_FOREIGN_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  foreignKeyId: string;
  foreignKeyName: string;
};

export type DropUniqueConstraintDiffOperation = {
  kind: "DROP_UNIQUE_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  uniqueConstraintId: string;
  uniqueConstraintName: string;
};

export type DropIndexDiffOperation = {
  kind: "DROP_INDEX";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  indexId: string;
  indexName: string;
};

export type UnsupportedDiffOperation = {
  kind: "UNSUPPORTED";
  risk: DiffOperationRisk;
  reason: string;
  objectType: string;
  objectName: string;
};

export type AlterPrimaryKeyDiffOperation = {
  kind: "ALTER_PRIMARY_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  oldName: string;
  newName: string;
  columnNames: string[];
};

export type AlterForeignKeyDiffOperation = {
  kind: "ALTER_FOREIGN_KEY";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  foreignKeyId: string;
  oldName: string;
  newName: string;
};

export type AlterUniqueConstraintDiffOperation = {
  kind: "ALTER_UNIQUE_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  uniqueConstraintId: string;
  oldName: string;
  newName: string;
};

export type AlterIndexDiffOperation = {
  kind: "ALTER_INDEX";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  indexId: string;
  oldName: string;
  newName: string;
};

export type AlterTableSchemaDiffOperation = {
  kind: "ALTER_TABLE_SCHEMA";
  risk: DiffOperationRisk;
  tableId: string;
  tableName: string;
  oldSchemaName: string;
  newSchemaName: string;
};

export type AddCheckConstraintDiffOperation = {
  kind: "ADD_CHECK_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  constraintId: string;
  constraintName: string;
  expression: string;
  columnIds?: string[];
};

export type DropCheckConstraintDiffOperation = {
  kind: "DROP_CHECK_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  constraintId: string;
  constraintName: string;
  expression: string;
  columnIds?: string[];
};

export type AlterCheckConstraintDiffOperation = {
  kind: "ALTER_CHECK_CONSTRAINT";
  risk: DiffOperationRisk;
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  oldSchemaName?: string;
  oldTableName?: string;
  constraintId: string;
  oldConstraintName: string;
  newConstraintName: string;
  oldExpression: string;
  newExpression: string;
  oldColumnIds?: string[];
  newColumnIds?: string[];
};

export type AddFunctionDiffOperation = {
  kind: "ADD_FUNCTION";
  risk: "warning";
  functionId: string;
  schemaId: string;
  schemaName: string;
  functionName: string;
  language: "plpgsql" | "sql";
  returnType: string;
  arguments: DatabaseFunctionArgument[];
  body: string;
};

export type DropFunctionDiffOperation = {
  kind: "DROP_FUNCTION";
  risk: "destructive";
  functionId: string;
  schemaId: string;
  schemaName: string;
  functionName: string;
  arguments: DatabaseFunctionArgument[];
};

export type AlterFunctionDiffOperation = {
  kind: "ALTER_FUNCTION";
  risk: "warning";
  functionId: string;

  oldSchemaId: string;
  newSchemaId: string;
  oldSchemaName: string;
  newSchemaName: string;

  oldFunctionName: string;
  newFunctionName: string;

  oldLanguage: "plpgsql" | "sql";
  newLanguage: "plpgsql" | "sql";

  oldReturnType: string;
  newReturnType: string;

  oldArguments: DatabaseFunctionArgument[];
  newArguments: DatabaseFunctionArgument[];

  oldBody: string;
  newBody: string;

  requiresDropAndRecreate: boolean;
};

export type AddTriggerDiffOperation = {
  kind: "ADD_TRIGGER";
  risk: "warning";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  triggerId: string;
  triggerName: string;
  eventTiming: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: ("INSERT" | "UPDATE" | "DELETE" | "TRUNCATE")[];
  functionId: string;
  condition?: string;
  isConstraint?: boolean;
  deferrable?: boolean;
  initiallyDeferred?: boolean;
  forEach: "ROW" | "STATEMENT";
};

export type DropTriggerDiffOperation = {
  kind: "DROP_TRIGGER";
  risk: "destructive";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  triggerId: string;
  triggerName: string;
};

export type AlterTriggerDiffOperation = {
  kind: "ALTER_TRIGGER";
  risk: "warning";
  schemaId: string;
  schemaName: string;
  tableId: string;
  tableName: string;
  oldSchemaName?: string;
  oldTableName?: string;
  triggerId: string;
  oldTriggerName: string;
  newTriggerName: string;

  // New trigger definition
  eventTiming: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: ("INSERT" | "UPDATE" | "DELETE" | "TRUNCATE")[];
  functionId: string;
  condition?: string;
  isConstraint?: boolean;
  deferrable?: boolean;
  initiallyDeferred?: boolean;
  forEach: "ROW" | "STATEMENT";

  // Previous trigger definition
  oldEventTiming: "BEFORE" | "AFTER" | "INSTEAD OF";
  oldEvents: ("INSERT" | "UPDATE" | "DELETE" | "TRUNCATE")[];
  oldFunctionId: string;
  oldCondition?: string;
  oldIsConstraint?: boolean;
  oldDeferrable?: boolean;
  oldInitiallyDeferred?: boolean;
  oldForEach: "ROW" | "STATEMENT";

  requiresDropAndRecreate: boolean;
};

export type AddViewDiffOperation = {
  kind: "ADD_VIEW";
  risk: "warning";
  schemaId: string;
  schemaName: string;
  viewId: string;
  viewName: string;
  definition: string;
  isMaterialized: boolean;
  withNoData?: boolean;
};

export type DropViewDiffOperation = {
  kind: "DROP_VIEW";
  risk: "destructive";
  schemaId: string;
  schemaName: string;
  viewId: string;
  viewName: string;
  isMaterialized: boolean;
  cascade?: boolean;
};

export type AlterViewDiffOperation = {
  kind: "ALTER_VIEW";
  risk: "destructive";
  schemaId: string;
  schemaName: string;
  viewId: string;
  oldSchemaName: string;
  oldViewName: string;
  newViewName: string;
  oldView: {
    schemaId: string;
    name: string;
    definition: string;
    isMaterialized: boolean;
    withNoData?: boolean;
  };
  newView: {
    schemaId: string;
    name: string;
    definition: string;
    isMaterialized: boolean;
    withNoData?: boolean;
  };
  requiresDropAndRecreate: true;
};
