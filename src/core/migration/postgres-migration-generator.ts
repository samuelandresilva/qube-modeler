import type { DatabaseProject, DatabaseFunctionArgument } from "../model/types";
import type { ProjectDiff, ProjectDiffOperation } from "../diff/project-diff-types";
import {
  generateSequenceSql,
  generateTableSql,
  generateColumnSql,
  generateForeignKeySql,
  generateAddUniqueConstraintSql,
  generateIndexSql,
  generateColumnTypeSql,
  generateTablePostCreateSql,
  generateFunctionSql,
  generateTriggerSql,
  generateViewSql,
} from "../sql/postgres-generator";

function formatStatement(sql: string, risk: string): string {
  if (risk === "destructive") {
    return `-- WARNING: Destructive operation!\n${sql}`;
  }
  return sql;
}

const OPERATION_ORDER: Record<string, number> = {
  DROP_CHECK_CONSTRAINT: 0,
  DROP_TRIGGER: 0.1,
  DROP_VIEW: 0.3,
  DROP_FUNCTION: 0.5,
  RENAME_SCHEMA: 1,
  ALTER_TABLE_SCHEMA: 3,
  RENAME_SEQUENCE: 4,
  RENAME_TABLE: 5,
  RENAME_COLUMN: 6,
  RENAME_PRIMARY_KEY: 7,
  RENAME_FOREIGN_KEY: 7,
  RENAME_UNIQUE_CONSTRAINT: 7,
  RENAME_INDEX: 7,
  ALTER_SEQUENCE: 8,
  CREATE_SCHEMA: 10,
  CREATE_SEQUENCE: 11,
  ADD_FUNCTION: 11.5,
  CREATE_TABLE: 12,
  DROP_FOREIGN_KEY: 20,
  DROP_UNIQUE_CONSTRAINT: 21,
  DROP_PRIMARY_KEY: 22,
  DROP_INDEX: 23,
  ALTER_FOREIGN_KEY: 25,
  ALTER_UNIQUE_CONSTRAINT: 26,
  ALTER_PRIMARY_KEY: 27,
  ALTER_INDEX: 28,
  ALTER_COLUMN_DEFAULT: 29,
  DROP_COLUMN: 30,
  DROP_SEQUENCE: 31,
  DROP_TABLE: 32,
  ADD_VIEW: 40,
  ADD_COLUMN: 50,
  ALTER_COLUMN_TYPE: 51,
  ALTER_COLUMN_SIZE: 52,
  ALTER_COLUMN_NULLABILITY: 53,
  ADD_CHECK_CONSTRAINT: 80,
  ADD_PRIMARY_KEY: 81,
  ADD_UNIQUE_CONSTRAINT: 82,
  ADD_FOREIGN_KEY: 83,
  ADD_INDEX: 84,
  ADD_TRIGGER: 85,
};

function getOperationOrder(operation: ProjectDiffOperation): number {
  return OPERATION_ORDER[operation.kind] ?? 100;
}

function mustDropBeforeRename(
  drop: ProjectDiffOperation,
  rename: ProjectDiffOperation,
): boolean {
  switch (rename.kind) {
    case "RENAME_SEQUENCE":
      return (
        drop.kind === "DROP_SEQUENCE" &&
        drop.schemaId === rename.schemaId &&
        drop.sequenceName === rename.newName
      );
    case "RENAME_TABLE":
      return (
        drop.kind === "DROP_TABLE" &&
        drop.schemaId === rename.schemaId &&
        drop.tableName === rename.newName
      );
    case "RENAME_COLUMN":
      return (
        drop.kind === "DROP_COLUMN" &&
        drop.tableId === rename.tableId &&
        drop.columnName === rename.newName
      );
    case "RENAME_FOREIGN_KEY":
      return (
        drop.kind === "DROP_FOREIGN_KEY" &&
        drop.tableId === rename.tableId &&
        drop.foreignKeyName === rename.newName
      );
    case "RENAME_UNIQUE_CONSTRAINT":
      return (
        drop.kind === "DROP_UNIQUE_CONSTRAINT" &&
        drop.tableId === rename.tableId &&
        drop.uniqueConstraintName === rename.newName
      );
    case "RENAME_INDEX":
      return (
        drop.kind === "DROP_INDEX" &&
        drop.schemaId === rename.schemaId &&
        drop.indexName === rename.newName
      );
    default:
      return false;
  }
}

function compareMigrationOperations(
  a: { op: ProjectDiffOperation; index: number },
  b: { op: ProjectDiffOperation; index: number },
): number {
  if (mustDropBeforeRename(a.op, b.op)) return -1;
  if (mustDropBeforeRename(b.op, a.op)) return 1;

  const orderA = getOperationOrder(a.op);
  const orderB = getOperationOrder(b.op);
  if (orderA !== orderB) return orderA - orderB;
  return a.index - b.index;
}

export function generatePostgresMigrationSql(
  diff: ProjectDiff,
  currentProject: DatabaseProject,
): string {
  if (!diff.operations || diff.operations.length === 0) {
    return "";
  }

  const expandedOperations: ProjectDiffOperation[] = [];
  for (const op of diff.operations) {
    if (op.kind === "ALTER_CHECK_CONSTRAINT") {
      expandedOperations.push({
        kind: "DROP_CHECK_CONSTRAINT",
        risk: op.risk,
        schemaId: op.schemaId,
        schemaName: op.oldSchemaName ?? op.schemaName,
        tableId: op.tableId,
        tableName: op.oldTableName ?? op.tableName,
        constraintId: op.constraintId,
        constraintName: op.oldConstraintName,
        expression: op.oldExpression,
        columnIds: op.oldColumnIds,
      } as ProjectDiffOperation);
      expandedOperations.push({
        kind: "ADD_CHECK_CONSTRAINT",
        risk: op.risk,
        schemaId: op.schemaId,
        schemaName: op.schemaName,
        tableId: op.tableId,
        tableName: op.tableName,
        constraintId: op.constraintId,
        constraintName: op.newConstraintName,
        expression: op.newExpression,
        columnIds: op.newColumnIds,
      } as ProjectDiffOperation);
    } else if (op.kind === "ALTER_FUNCTION") {
      if (op.requiresDropAndRecreate) {
        expandedOperations.push({
          kind: "DROP_FUNCTION",
          risk: "destructive",
          functionId: op.functionId,
          schemaId: op.oldSchemaId,
          schemaName: op.oldSchemaName,
          functionName: op.oldFunctionName,
          arguments: op.oldArguments,
        } as ProjectDiffOperation);

        expandedOperations.push({
          kind: "ADD_FUNCTION",
          risk: op.risk,
          functionId: op.functionId,
          schemaId: op.newSchemaId,
          schemaName: op.newSchemaName,
          functionName: op.newFunctionName,
          language: op.newLanguage,
          returnType: op.newReturnType,
          arguments: op.newArguments,
          body: op.newBody,
        } as ProjectDiffOperation);
      } else {
        expandedOperations.push({
          kind: "ADD_FUNCTION",
          risk: op.risk,
          functionId: op.functionId,
          schemaId: op.newSchemaId,
          schemaName: op.newSchemaName,
          functionName: op.newFunctionName,
          language: op.newLanguage,
          returnType: op.newReturnType,
          arguments: op.newArguments,
          body: op.newBody,
        } as ProjectDiffOperation);
      }
    } else if (op.kind === "ALTER_TRIGGER") {
      expandedOperations.push({
        kind: "DROP_TRIGGER",
        risk: "destructive",
        schemaId: op.schemaId,
        schemaName: op.oldSchemaName ?? op.schemaName,
        tableId: op.tableId,
        tableName: op.oldTableName ?? op.tableName,
        triggerId: op.triggerId,
        triggerName: op.oldTriggerName,
      } as ProjectDiffOperation);
      expandedOperations.push({
        kind: "ADD_TRIGGER",
        risk: op.risk,
        schemaId: op.schemaId,
        schemaName: op.schemaName,
        tableId: op.tableId,
        tableName: op.tableName,
        triggerId: op.triggerId,
        triggerName: op.newTriggerName,
        eventTiming: op.eventTiming,
        events: op.events,
        functionId: op.functionId,
        condition: op.condition,
        isConstraint: op.isConstraint,
        deferrable: op.deferrable,
        initiallyDeferred: op.initiallyDeferred,
        forEach: op.forEach,
      } as ProjectDiffOperation);
    } else if (op.kind === "ALTER_VIEW") {
      expandedOperations.push({
        kind: "DROP_VIEW",
        risk: "destructive",
        schemaId: op.oldView.schemaId,
        schemaName: op.oldSchemaName,
        viewId: op.viewId,
        viewName: op.oldViewName,
        isMaterialized: op.oldView.isMaterialized,
      } as ProjectDiffOperation);
      expandedOperations.push({
        kind: "ADD_VIEW",
        risk: "warning",
        schemaId: op.newView.schemaId,
        schemaName: op.schemaName,
        viewId: op.viewId,
        viewName: op.newViewName,
        definition: op.newView.definition,
        isMaterialized: op.newView.isMaterialized,
        withNoData: op.newView.withNoData,
      } as ProjectDiffOperation);
    } else {
      expandedOperations.push(op);
    }
  }

  const sortedOperations = [...expandedOperations]
    .map((op, index) => ({ op, index }))
    .sort(compareMigrationOperations)
    .map((item) => item.op);

  const sqlStatements: string[] = [];
  const createdTablePostCreateStatements: string[] = [];
  let createdTablePostCreateStatementsFlushed = false;

  const flushCreatedTablePostCreateStatements = () => {
    if (createdTablePostCreateStatementsFlushed) return;
    sqlStatements.push(...createdTablePostCreateStatements);
    createdTablePostCreateStatementsFlushed = true;
  };

  for (const op of sortedOperations) {
    if (op.risk === "unsupported") {
      continue;
    }

    if (op.kind !== "CREATE_SCHEMA" && op.kind !== "CREATE_SEQUENCE" && op.kind !== "CREATE_TABLE") {
      flushCreatedTablePostCreateStatements();
    }

    switch (op.kind) {
      case "CREATE_SCHEMA": {
        sqlStatements.push(formatStatement(
          `CREATE SCHEMA IF NOT EXISTS ${op.schemaName};`,
          op.risk
        ));
        break;
      }

      case "ALTER_TABLE_SCHEMA": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.oldSchemaName}.${op.tableName} SET SCHEMA ${op.newSchemaName};`,
          op.risk
        ));
        break;
      }

      case "CREATE_SEQUENCE": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const sequence = schema.sequences.find((seq) => seq.id === op.sequenceId);
        if (!sequence) {
          throw new Error(`Sequence ${op.sequenceName} (ID: ${op.sequenceId}) not found in schema ${schema.name}.`);
        }
        sqlStatements.push(formatStatement(
          generateSequenceSql(schema, sequence),
          op.risk
        ));
        break;
      }

      case "CREATE_TABLE": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        sqlStatements.push(formatStatement(
          generateTableSql(schema, table, { includeConstraints: false }),
          op.risk
        ));
        createdTablePostCreateStatements.push(
          ...generateTablePostCreateSql(schema, table).map((sql) =>
            formatStatement(sql, op.risk),
          ),
          ...table.indexes.map((index) =>
            formatStatement(generateIndexSql(schema, table, index), op.risk),
          ),
        );
        break;
      }

      case "ADD_COLUMN": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const column = table.columns.find((c) => c.id === op.columnId);
        if (!column) {
          throw new Error(`Column ${op.columnName} (ID: ${op.columnId}) not found in table ${table.name}.`);
        }
        const columnDef = generateColumnSql(schema, column).trim();
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${schema.name}.${table.name} ADD COLUMN ${columnDef};`,
          op.risk
        ));
        break;
      }

      case "ADD_PRIMARY_KEY": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${schema.name}.${table.name} ADD CONSTRAINT pk_${table.name} PRIMARY KEY (${op.columnNames.join(", ")});`,
          op.risk
        ));
        break;
      }

      case "ADD_FOREIGN_KEY": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const fk = table.foreignKeys.find((f) => f.id === op.foreignKeyId);
        if (!fk) {
          throw new Error(`Foreign Key ${op.foreignKeyName} (ID: ${op.foreignKeyId}) not found in table ${table.name}.`);
        }
        const fkDef = generateForeignKeySql(fk).trim();
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${schema.name}.${table.name} ADD ${fkDef};`,
          op.risk
        ));
        break;
      }

      case "ADD_UNIQUE_CONSTRAINT": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const uc = table.uniqueConstraints.find((u) => u.id === op.uniqueConstraintId);
        if (!uc) {
          throw new Error(`Unique Constraint ${op.uniqueConstraintName} (ID: ${op.uniqueConstraintId}) not found in table ${table.name}.`);
        }
        const addSql = generateAddUniqueConstraintSql(schema, table, uc);
        sqlStatements.push(formatStatement(addSql, op.risk));
        break;
      }

      case "ADD_INDEX": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const idx = table.indexes.find((i) => i.id === op.indexId);
        if (!idx) {
          throw new Error(`Index ${op.indexName} (ID: ${op.indexId}) not found in table ${table.name}.`);
        }
        sqlStatements.push(formatStatement(
          generateIndexSql(schema, table, idx),
          op.risk
        ));
        break;
      }

      case "ALTER_PRIMARY_KEY": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const sql = [
          `ALTER TABLE ${schema.name}.${table.name} DROP CONSTRAINT ${op.oldName};`,
          `ALTER TABLE ${schema.name}.${table.name} ADD CONSTRAINT ${op.newName} PRIMARY KEY (${op.columnNames.join(", ")});`
        ].join("\n");
        sqlStatements.push(formatStatement(sql, op.risk));
        break;
      }

      case "ALTER_FOREIGN_KEY": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const fk = table.foreignKeys.find((f) => f.id === op.foreignKeyId);
        if (!fk) {
          throw new Error(`Foreign Key (ID: ${op.foreignKeyId}) not found in table ${table.name}.`);
        }
        const fkDef = generateForeignKeySql(fk).trim();
        const sql = [
          `ALTER TABLE ${schema.name}.${table.name} DROP CONSTRAINT ${op.oldName};`,
          `ALTER TABLE ${schema.name}.${table.name} ADD ${fkDef};`
        ].join("\n");
        sqlStatements.push(formatStatement(sql, op.risk));
        break;
      }

      case "ALTER_UNIQUE_CONSTRAINT": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const uc = table.uniqueConstraints.find((u) => u.id === op.uniqueConstraintId);
        if (!uc) {
          throw new Error(`Unique Constraint (ID: ${op.uniqueConstraintId}) not found in table ${table.name}.`);
        }
        const dropSql = op.oldCondition
          ? `DROP INDEX ${schema.name}.${op.oldName};`
          : `ALTER TABLE ${schema.name}.${table.name} DROP CONSTRAINT ${op.oldName};`;
        const addSql = generateAddUniqueConstraintSql(schema, table, uc);
        const sql = [dropSql, addSql].join("\n");
        sqlStatements.push(formatStatement(sql, op.risk));
        break;
      }

      case "ALTER_INDEX": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const idx = table.indexes.find((i) => i.id === op.indexId);
        if (!idx) {
          throw new Error(`Index (ID: ${op.indexId}) not found in table ${table.name}.`);
        }
        const idxDef = generateIndexSql(schema, table, idx).trim();
        const sql = [
          `DROP INDEX ${schema.name}.${op.oldName};`,
          idxDef
        ].join("\n");
        sqlStatements.push(formatStatement(sql, op.risk));
        break;
      }

      // Renames
      case "RENAME_SCHEMA": {
        sqlStatements.push(formatStatement(
          `ALTER SCHEMA ${op.oldName} RENAME TO ${op.newName};`,
          op.risk
        ));
        break;
      }

      case "RENAME_SEQUENCE": {
        sqlStatements.push(formatStatement(
          `ALTER SEQUENCE ${op.schemaName}.${op.oldName} RENAME TO ${op.newName};`,
          op.risk
        ));
        break;
      }

      case "RENAME_TABLE": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.oldName} RENAME TO ${op.newName};`,
          op.risk
        ));
        break;
      }

      case "RENAME_COLUMN": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} RENAME COLUMN ${op.oldName} TO ${op.newName};`,
          op.risk
        ));
        break;
      }

      case "RENAME_PRIMARY_KEY":
      case "RENAME_FOREIGN_KEY":
      case "RENAME_UNIQUE_CONSTRAINT": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} RENAME CONSTRAINT ${op.oldName} TO ${op.newName};`,
          op.risk
        ));
        break;
      }

      case "RENAME_INDEX": {
        sqlStatements.push(formatStatement(
          `ALTER INDEX ${op.schemaName}.${op.oldName} RENAME TO ${op.newName};`,
          op.risk
        ));
        break;
      }

      case "ALTER_SEQUENCE": {
        sqlStatements.push(formatStatement(
          [
            `ALTER SEQUENCE ${op.schemaName}.${op.sequenceName}`,
            `    START WITH ${op.newStartWith}`,
            `    INCREMENT BY ${op.newIncrementBy};`,
          ].join("\n"),
          op.risk
        ));
        break;
      }

      // Column alterations
      case "ALTER_COLUMN_TYPE": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const column = table.columns.find((c) => c.id === op.columnId);
        if (!column) {
          throw new Error(`Column ${op.columnName} (ID: ${op.columnId}) not found in table ${table.name}.`);
        }
        const fullType = generateColumnTypeSql(column);
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ALTER COLUMN ${op.columnName} TYPE ${fullType};`,
          op.risk
        ));
        break;
      }

      case "ALTER_COLUMN_SIZE": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const column = table.columns.find((c) => c.id === op.columnId);
        if (!column) {
          throw new Error(`Column ${op.columnName} (ID: ${op.columnId}) not found in table ${table.name}.`);
        }
        const fullType = generateColumnTypeSql(column);
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ALTER COLUMN ${op.columnName} TYPE ${fullType};`,
          op.risk
        ));
        break;
      }

      case "ALTER_COLUMN_NULLABILITY": {
        const action = op.newNullable ? "DROP NOT NULL" : "SET NOT NULL";
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ALTER COLUMN ${op.columnName} ${action};`,
          op.risk
        ));
        break;
      }

      case "ALTER_COLUMN_DEFAULT": {
        const action = op.newDefault ? `SET DEFAULT ${op.newDefault}` : "DROP DEFAULT";
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ALTER COLUMN ${op.columnName} ${action};`,
          op.risk
        ));
        break;
      }

      // Drops
      case "DROP_SEQUENCE": {
        sqlStatements.push(formatStatement(
          `DROP SEQUENCE ${op.schemaName}.${op.sequenceName};`,
          op.risk
        ));
        break;
      }

      case "DROP_TABLE": {
        sqlStatements.push(formatStatement(
          `DROP TABLE ${op.schemaName}.${op.tableName};`,
          op.risk
        ));
        break;
      }

      case "DROP_COLUMN": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} DROP COLUMN ${op.columnName};`,
          op.risk
        ));
        break;
      }

      case "DROP_PRIMARY_KEY": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} DROP CONSTRAINT pk_${op.tableName};`,
          op.risk
        ));
        break;
      }

      case "DROP_FOREIGN_KEY": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} DROP CONSTRAINT ${op.foreignKeyName};`,
          op.risk
        ));
        break;
      }

      case "DROP_UNIQUE_CONSTRAINT": {
        const dropSql = op.oldCondition
          ? `DROP INDEX ${op.schemaName}.${op.uniqueConstraintName};`
          : `ALTER TABLE ${op.schemaName}.${op.tableName} DROP CONSTRAINT ${op.uniqueConstraintName};`;
        sqlStatements.push(formatStatement(dropSql, op.risk));
        break;
      }

      case "DROP_INDEX": {
        sqlStatements.push(formatStatement(
          `DROP INDEX ${op.schemaName}.${op.indexName};`,
          op.risk
        ));
        break;
      }

      case "ADD_CHECK_CONSTRAINT": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ADD CONSTRAINT ${op.constraintName} CHECK (${op.expression});`,
          op.risk
        ));
        break;
      }

      case "DROP_CHECK_CONSTRAINT": {
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} DROP CONSTRAINT ${op.constraintName};`,
          op.risk
        ));
        break;
      }

      case "ADD_FUNCTION": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const fn = {
          id: op.functionId,
          schemaId: op.schemaId,
          name: op.functionName,
          language: op.language,
          returnType: op.returnType,
          arguments: op.arguments,
          body: op.body,
        };
        sqlStatements.push(formatStatement(
          generateFunctionSql(schema, fn),
          op.risk
        ));
        break;
      }

      case "DROP_FUNCTION": {
        const sql = generateDropFunctionSql(
          op.schemaName,
          op.functionName,
          op.arguments ?? []
        );
        sqlStatements.push(formatStatement(sql, op.risk));
        break;
      }

      case "ADD_TRIGGER": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const table = schema.tables.find((t) => t.id === op.tableId);
        if (!table) {
          throw new Error(`Table ${op.tableName} (ID: ${op.tableId}) not found in schema ${schema.name}.`);
        }
        const trigger = {
          id: op.triggerId,
          name: op.triggerName,
          eventTiming: op.eventTiming,
          events: op.events,
          functionId: op.functionId,
          condition: op.condition,
          isConstraint: op.isConstraint,
          deferrable: op.deferrable,
          initiallyDeferred: op.initiallyDeferred,
          forEach: op.forEach,
        };
        sqlStatements.push(formatStatement(
          generateTriggerSql(schema, table, trigger, currentProject),
          op.risk
        ));
        break;
      }

      case "DROP_TRIGGER": {
        sqlStatements.push(formatStatement(
          `DROP TRIGGER IF EXISTS ${op.triggerName} ON ${op.schemaName}.${op.tableName};`,
          op.risk
        ));
        break;
      }

      case "ADD_VIEW": {
        const schema = currentProject.schemas.find((s) => s.id === op.schemaId);
        if (!schema) {
          throw new Error(`Schema ${op.schemaName} (ID: ${op.schemaId}) not found in current project.`);
        }
        const view = {
          id: op.viewId,
          schemaId: op.schemaId,
          name: op.viewName,
          definition: op.definition,
          isMaterialized: op.isMaterialized,
          withNoData: op.withNoData,
          x: 0,
          y: 0,
        };
        sqlStatements.push(formatStatement(
          generateViewSql(schema, view),
          op.risk
        ));
        break;
      }

      case "DROP_VIEW": {
        const typeStr = op.isMaterialized ? "MATERIALIZED VIEW" : "VIEW";
        const cascadeStr = op.cascade ? " CASCADE" : "";
        sqlStatements.push(formatStatement(
          `DROP ${typeStr} IF EXISTS ${op.schemaName}.${op.viewName}${cascadeStr};`,
          op.risk
        ));
        break;
      }

      default:
        break;
    }
  }

  flushCreatedTablePostCreateStatements();

  return sqlStatements.join("\n\n");
}

function generateDropFunctionSql(
  schemaName: string,
  name: string,
  args: DatabaseFunctionArgument[],
): string {
  const argTypesStr = args.map((arg) => arg.dataType.trim()).join(", ");
  return `DROP FUNCTION ${schemaName}.${name}(${argTypesStr});`;
}
