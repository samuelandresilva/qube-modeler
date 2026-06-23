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

export function generatePostgresMigrationSql(
  diff: ProjectDiff,
  currentProject: DatabaseProject,
): string {
  if (!diff.operations || diff.operations.length === 0) {
    return "";
  }

  const sqlStatements: string[] = [];

  for (const op of diff.operations) {
    switch (op.kind) {
      case "CREATE_SCHEMA": {
        sqlStatements.push(`CREATE SCHEMA IF NOT EXISTS ${op.schemaName};`);
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
        sqlStatements.push(generateSequenceSql(schema, sequence));
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
        sqlStatements.push(generateTableSql(schema, table));
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
        // generateColumnSql generates the column definition with leading spaces. We trim it for ALTER TABLE statement.
        const columnDef = generateColumnSql(schema, column).trim();
        sqlStatements.push(`ALTER TABLE ${schema.name}.${table.name} ADD COLUMN ${columnDef};`);
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
        
        sqlStatements.push(
          `ALTER TABLE ${schema.name}.${table.name} ADD CONSTRAINT pk_${table.name} PRIMARY KEY (${op.columnNames.join(", ")});`
        );
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
        sqlStatements.push(`ALTER TABLE ${schema.name}.${table.name} ADD ${fkDef};`);
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
        sqlStatements.push(`ALTER TABLE ${schema.name}.${table.name} ADD ${ucDef};`);
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
        sqlStatements.push(generateIndexSql(schema, table, idx));
        break;
      }

      default:
        break;
    }
  }

  return sqlStatements.join("\n\n");
}
