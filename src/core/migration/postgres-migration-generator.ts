import type { DatabaseProject } from "../model/types";
import type { ProjectDiff, ProjectDiffOperation } from "../diff/project-diff-types";
import {
  generateSequenceSql,
  generateTableSql,
  generateColumnSql,
  generateForeignKeySql,
  generateUniqueConstraintSql,
  generateIndexSql,
  generateColumnTypeSql,
  generateTablePostCreateSql,
} from "../sql/postgres-generator";

function formatStatement(sql: string, risk: string): string {
  if (risk === "destructive") {
    return `-- WARNING: Destructive operation!\n${sql}`;
  }
  return sql;
}

const OPERATION_ORDER: Record<string, number> = {
  RENAME_SCHEMA: 1,
  RENAME_SEQUENCE: 2,
  RENAME_TABLE: 3,
  RENAME_COLUMN: 4,
  RENAME_PRIMARY_KEY: 5,
  RENAME_FOREIGN_KEY: 5,
  RENAME_UNIQUE_CONSTRAINT: 5,
  RENAME_INDEX: 5,
  CREATE_SCHEMA: 10,
  CREATE_SEQUENCE: 11,
  CREATE_TABLE: 12,
  DROP_FOREIGN_KEY: 20,
  DROP_UNIQUE_CONSTRAINT: 21,
  DROP_PRIMARY_KEY: 22,
  DROP_INDEX: 23,
  ALTER_FOREIGN_KEY: 24,
  ALTER_UNIQUE_CONSTRAINT: 25,
  ALTER_PRIMARY_KEY: 26,
  ALTER_INDEX: 27,
  DROP_COLUMN: 28,
  DROP_SEQUENCE: 29,
  DROP_TABLE: 30,
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

  const sortedOperations = [...diff.operations]
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
        const ucDef = generateUniqueConstraintSql(uc).trim();
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${schema.name}.${table.name} ADD ${ucDef};`,
          op.risk
        ));
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
        const ucDef = generateUniqueConstraintSql(uc).trim();
        const sql = [
          `ALTER TABLE ${schema.name}.${table.name} DROP CONSTRAINT ${op.oldName};`,
          `ALTER TABLE ${schema.name}.${table.name} ADD ${ucDef};`
        ].join("\n");
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
        const type = column.type;
        const sizeStr = op.newSize !== undefined ? `(${op.newSize})` : "";
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ALTER COLUMN ${op.columnName} TYPE ${type}${sizeStr};`,
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
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} DROP CONSTRAINT ${op.uniqueConstraintName};`,
          op.risk
        ));
        break;
      }

      case "DROP_INDEX": {
        sqlStatements.push(formatStatement(
          `DROP INDEX ${op.schemaName}.${op.indexName};`,
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
