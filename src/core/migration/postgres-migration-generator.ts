import type { DatabaseProject } from "../model/types";
import type { ProjectDiff } from "../diff/project-diff-types";
import {
  generateSequenceSql,
  generateTableSql,
  generateColumnSql,
  generateForeignKeySql,
  generateUniqueConstraintSql,
  generateIndexSql,
} from "../sql/postgres-generator";

function formatStatement(sql: string, risk: string): string {
  if (risk === "destructive") {
    return `-- WARNING: Destructive operation!\n${sql}`;
  }
  return sql;
}

export function generatePostgresMigrationSql(
  diff: ProjectDiff,
  currentProject: DatabaseProject,
): string {
  if (!diff.operations || diff.operations.length === 0) {
    return "";
  }

  const sqlStatements: string[] = [];

  for (const op of diff.operations) {
    if (op.risk === "unsupported") {
      continue;
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
          generateTableSql(schema, table),
          op.risk
        ));
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
        sqlStatements.push(formatStatement(
          `ALTER TABLE ${op.schemaName}.${op.tableName} ALTER COLUMN ${op.columnName} TYPE ${op.newType};`,
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

  return sqlStatements.join("\n\n");
}
