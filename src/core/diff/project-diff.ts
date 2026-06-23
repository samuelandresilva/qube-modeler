import type { DatabaseProject } from "../model/types";
import type { ProjectDiff, ProjectDiffOperation, UnsupportedDiffOperation } from "./project-diff-types";

export function diffProjects(
  previousProject: DatabaseProject,
  currentProject: DatabaseProject,
): ProjectDiff {
  const operations: ProjectDiffOperation[] = [];
  const unsupportedOperations: UnsupportedDiffOperation[] = [];

  const prevSchemas = new Map(previousProject.schemas.map((s) => [s.id, s]));
  const currSchemas = new Map(currentProject.schemas.map((s) => [s.id, s]));

  // 1. Detect schema additions
  for (const currSchema of currentProject.schemas) {
    if (!prevSchemas.has(currSchema.id)) {
      operations.push({
        kind: "CREATE_SCHEMA",
        schemaId: currSchema.id,
        schemaName: currSchema.name,
      });
    }
  }

  // 2. Detect schema drops (unsupported)
  for (const prevSchema of previousProject.schemas) {
    if (!currSchemas.has(prevSchema.id)) {
      unsupportedOperations.push({
        kind: "UNSUPPORTED",
        reason: "Schema dropping is not supported",
        objectType: "SCHEMA",
        objectName: prevSchema.name,
      });
    }
  }

  // 3. Process schemas present in current (including new schemas)
  for (const currSchema of currentProject.schemas) {
    const prevSchema = prevSchemas.get(currSchema.id);

    // If the schema is entirely new, there is no prevSchema.
    // In this case, every sequence and table inside it is also new and needs to be created.
    const prevSeqs = new Map(prevSchema?.sequences.map((seq) => [seq.id, seq]) ?? []);
    const currSeqs = new Map(currSchema.sequences.map((seq) => [seq.id, seq]));

    // Detect sequence additions
    for (const currSeq of currSchema.sequences) {
      if (!prevSeqs.has(currSeq.id)) {
        operations.push({
          kind: "CREATE_SEQUENCE",
          schemaId: currSchema.id,
          schemaName: currSchema.name,
          sequenceId: currSeq.id,
          sequenceName: currSeq.name,
        });
      }
    }

    // Detect sequence drops (unsupported)
    if (prevSchema) {
      for (const prevSeq of prevSchema.sequences) {
        if (!currSeqs.has(prevSeq.id)) {
          unsupportedOperations.push({
            kind: "UNSUPPORTED",
            reason: "Sequence dropping is not supported",
            objectType: "SEQUENCE",
            objectName: `${prevSchema.name}.${prevSeq.name}`,
          });
        }
      }
    }

    const prevTables = new Map(prevSchema?.tables.map((t) => [t.id, t]) ?? []);
    const currTables = new Map(currSchema.tables.map((t) => [t.id, t]));

    // Process tables
    for (const currTable of currSchema.tables) {
      const prevTable = prevTables.get(currTable.id);

      if (!prevTable) {
        // Table is new: CREATE_TABLE represents the creation of the schema object.
        // Inner columns/constraints do not get separate operations.
        operations.push({
          kind: "CREATE_TABLE",
          schemaId: currSchema.id,
          schemaName: currSchema.name,
          tableId: currTable.id,
          tableName: currTable.name,
        });
      } else {
        // Table existed: Compare columns, PK, FK, Unique constraints, and Indexes.
        const activePrevSchema = prevSchema!;
        const prevCols = new Map(prevTable.columns.map((c) => [c.id, c]));
        const currCols = new Map(currTable.columns.map((c) => [c.id, c]));

        // Columns additions
        for (const currCol of currTable.columns) {
          if (!prevCols.has(currCol.id)) {
            operations.push({
              kind: "ADD_COLUMN",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              columnId: currCol.id,
              columnName: currCol.name,
            });
          }
        }

        // Columns drops (unsupported)
        for (const prevCol of prevTable.columns) {
          if (!currCols.has(prevCol.id)) {
            unsupportedOperations.push({
              kind: "UNSUPPORTED",
              reason: "Column dropping is not supported",
              objectType: "COLUMN",
              objectName: `${activePrevSchema.name}.${prevTable.name}.${prevCol.name}`,
            });
          }
        }

        // Primary Key check
        const prevPkCols = prevTable.columns.filter((c) => c.primaryKey);
        const currPkCols = currTable.columns.filter((c) => c.primaryKey);

        if (prevPkCols.length === 0 && currPkCols.length > 0) {
          operations.push({
            kind: "ADD_PRIMARY_KEY",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            tableId: currTable.id,
            tableName: currTable.name,
            columnIds: currPkCols.map((c) => c.id),
            columnNames: currPkCols.map((c) => c.name),
          });
        } else if (prevPkCols.length > 0 && currPkCols.length === 0) {
          unsupportedOperations.push({
            kind: "UNSUPPORTED",
            reason: "Primary key dropping is not supported",
            objectType: "PRIMARY_KEY",
            objectName: `${currSchema.name}.${currTable.name}.pk`,
          });
        }

        // Foreign Keys additions & drops
        const prevFks = new Map(prevTable.foreignKeys.map((fk) => [fk.id, fk]));
        const currFks = new Map(currTable.foreignKeys.map((fk) => [fk.id, fk]));

        for (const currFk of currTable.foreignKeys) {
          if (!prevFks.has(currFk.id)) {
            operations.push({
              kind: "ADD_FOREIGN_KEY",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              foreignKeyId: currFk.id,
              foreignKeyName: currFk.name,
            });
          }
        }

        for (const prevFk of prevTable.foreignKeys) {
          if (!currFks.has(prevFk.id)) {
            unsupportedOperations.push({
              kind: "UNSUPPORTED",
              reason: "Foreign key dropping is not supported",
              objectType: "FOREIGN_KEY",
              objectName: `${activePrevSchema.name}.${prevTable.name}.${prevFk.name}`,
            });
          }
        }

        // Unique Constraints additions & drops
        const prevUcs = new Map(prevTable.uniqueConstraints.map((uc) => [uc.id, uc]));
        const currUcs = new Map(currTable.uniqueConstraints.map((uc) => [uc.id, uc]));

        for (const currUc of currTable.uniqueConstraints) {
          if (!prevUcs.has(currUc.id)) {
            operations.push({
              kind: "ADD_UNIQUE_CONSTRAINT",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              uniqueConstraintId: currUc.id,
              uniqueConstraintName: currUc.name,
            });
          }
        }

        for (const prevUc of prevTable.uniqueConstraints) {
          if (!currUcs.has(prevUc.id)) {
            unsupportedOperations.push({
              kind: "UNSUPPORTED",
              reason: "Unique constraint dropping is not supported",
              objectType: "UNIQUE_CONSTRAINT",
              objectName: `${activePrevSchema.name}.${prevTable.name}.${prevUc.name}`,
            });
          }
        }

        // Indexes additions & drops
        const prevIdxs = new Map(prevTable.indexes.map((idx) => [idx.id, idx]));
        const currIdxs = new Map(currTable.indexes.map((idx) => [idx.id, idx]));

        for (const currIdx of currTable.indexes) {
          if (!prevIdxs.has(currIdx.id)) {
            operations.push({
              kind: "ADD_INDEX",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              indexId: currIdx.id,
              indexName: currIdx.name,
            });
          }
        }

        for (const prevIdx of prevTable.indexes) {
          if (!currIdxs.has(prevIdx.id)) {
            unsupportedOperations.push({
              kind: "UNSUPPORTED",
              reason: "Index dropping is not supported",
              objectType: "INDEX",
              objectName: `${activePrevSchema.name}.${prevTable.name}.${prevIdx.name}`,
            });
          }
        }
      }
    }

    // Detect table drops (unsupported)
    if (prevSchema) {
      for (const prevTable of prevSchema.tables) {
        if (!currTables.has(prevTable.id)) {
          unsupportedOperations.push({
            kind: "UNSUPPORTED",
            reason: "Table dropping is not supported",
            objectType: "TABLE",
            objectName: `${prevSchema.name}.${prevTable.name}`,
          });
        }
      }
    }
  }

  return {
    operations,
    unsupportedOperations,
  };
}
