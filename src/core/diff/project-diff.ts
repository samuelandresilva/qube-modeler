import type { DatabaseProject, DatabaseSchema, DatabaseTable, DatabaseForeignKey, DatabaseUniqueConstraint, DatabaseIndex } from "../model/types";
import type { ProjectDiff, ProjectDiffOperation, UnsupportedDiffOperation } from "./project-diff-types";

function findTableIdByName(
  project: DatabaseProject,
  schemaName: string,
  tableName: string,
): string | undefined {
  const schema = project.schemas.find((s) => s.name === schemaName);
  const table = schema?.tables.find((t) => t.name === tableName);
  return table?.id;
}

function didForeignKeyChange(
  prevProject: DatabaseProject,
  currProject: DatabaseProject,
  prevFk: DatabaseForeignKey,
  currFk: DatabaseForeignKey,
): boolean {
  const prevTargetId = findTableIdByName(prevProject, prevFk.targetSchema, prevFk.targetTable);
  const currTargetId = findTableIdByName(currProject, currFk.targetSchema, currFk.targetTable);
  const targetTableChanged = prevTargetId !== currTargetId;

  if (targetTableChanged) {
    if (prevFk.targetSchema !== currFk.targetSchema) return true;
    if (prevFk.targetTable !== currFk.targetTable) return true;
  }
  if (prevFk.onDelete !== currFk.onDelete) return true;
  if (prevFk.onUpdate !== currFk.onUpdate) return true;
  
  if (prevFk.sourceColumns.length !== currFk.sourceColumns.length) return true;
  for (let i = 0; i < prevFk.sourceColumns.length; i++) {
    if (prevFk.sourceColumns[i] !== currFk.sourceColumns[i]) return true;
  }
  
  if (prevFk.targetColumns.length !== currFk.targetColumns.length) return true;
  for (let i = 0; i < prevFk.targetColumns.length; i++) {
    if (prevFk.targetColumns[i] !== currFk.targetColumns[i]) return true;
  }
  
  return false;
}

function didUniqueConstraintChange(prevUc: DatabaseUniqueConstraint, currUc: DatabaseUniqueConstraint): boolean {
  if (prevUc.columns.length !== currUc.columns.length) return true;
  for (let i = 0; i < prevUc.columns.length; i++) {
    if (prevUc.columns[i] !== currUc.columns[i]) return true;
  }
  return false;
}

function didIndexChange(prevIdx: DatabaseIndex, currIdx: DatabaseIndex): boolean {
  if (prevIdx.columns.length !== currIdx.columns.length) return true;
  for (let i = 0; i < prevIdx.columns.length; i++) {
    if (prevIdx.columns[i] !== currIdx.columns[i]) return true;
  }
  return false;
}

function areColumnIdsEqual(a?: string[], b?: string[]): boolean {
  const arrA = a ?? [];
  const arrB = b ?? [];
  if (arrA.length !== arrB.length) return false;
  const setA = new Set(arrA);
  return arrB.every((id) => setA.has(id));
}

export function diffProjects(
  previousProject: DatabaseProject,
  currentProject: DatabaseProject,
): ProjectDiff {
  const operations: ProjectDiffOperation[] = [];
  const unsupportedOperations: UnsupportedDiffOperation[] = [];

  const prevSchemas = new Map(previousProject.schemas.map((s) => [s.id, s]));
  const currSchemas = new Map(currentProject.schemas.map((s) => [s.id, s]));

  const prevTablesGlobal = new Map<string, { schema: DatabaseSchema; table: DatabaseTable }>();
  for (const schema of previousProject.schemas) {
    for (const table of schema.tables) {
      prevTablesGlobal.set(table.id, { schema, table });
    }
  }

  const currTablesGlobal = new Map<string, { schema: DatabaseSchema; table: DatabaseTable }>();
  for (const schema of currentProject.schemas) {
    for (const table of schema.tables) {
      currTablesGlobal.set(table.id, { schema, table });
    }
  }

  // 1. Detect schema additions and renames
  for (const currSchema of currentProject.schemas) {
    const prevSchema = prevSchemas.get(currSchema.id);
    if (!prevSchema) {
      operations.push({
        kind: "CREATE_SCHEMA",
        risk: "safe",
        schemaId: currSchema.id,
        schemaName: currSchema.name,
      });
    } else if (currSchema.name !== prevSchema.name) {
      operations.push({
        kind: "RENAME_SCHEMA",
        risk: "warning",
        schemaId: currSchema.id,
        oldName: prevSchema.name,
        newName: currSchema.name,
      });
    }
  }

  // 2. Detect schema drops (unsupported)
  for (const prevSchema of previousProject.schemas) {
    if (!currSchemas.has(prevSchema.id)) {
      unsupportedOperations.push({
        kind: "UNSUPPORTED",
        risk: "unsupported",
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

    // Detect sequence additions and renames
    for (const currSeq of currSchema.sequences) {
      const prevSeq = prevSeqs.get(currSeq.id);
      if (!prevSeq) {
        operations.push({
          kind: "CREATE_SEQUENCE",
          risk: "safe",
          schemaId: currSchema.id,
          schemaName: currSchema.name,
          sequenceId: currSeq.id,
          sequenceName: currSeq.name,
        });
      } else if (currSeq.name !== prevSeq.name) {
        operations.push({
          kind: "RENAME_SEQUENCE",
          risk: "warning",
          schemaId: currSchema.id,
          schemaName: currSchema.name,
          sequenceId: currSeq.id,
          oldName: prevSeq.name,
          newName: currSeq.name,
        });
      }

      if (
        prevSeq &&
        (currSeq.startWith !== prevSeq.startWith ||
          currSeq.incrementBy !== prevSeq.incrementBy)
      ) {
        operations.push({
          kind: "ALTER_SEQUENCE",
          risk: "warning",
          schemaId: currSchema.id,
          schemaName: currSchema.name,
          sequenceId: currSeq.id,
          sequenceName: currSeq.name,
          oldStartWith: prevSeq.startWith,
          newStartWith: currSeq.startWith,
          oldIncrementBy: prevSeq.incrementBy,
          newIncrementBy: currSeq.incrementBy,
        });
      }
    }

    // Detect sequence drops
    if (prevSchema) {
      for (const prevSeq of prevSchema.sequences) {
        if (!currSeqs.has(prevSeq.id)) {
          operations.push({
            kind: "DROP_SEQUENCE",
            risk: "destructive",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            sequenceId: prevSeq.id,
            sequenceName: prevSeq.name,
          });
        }
      }
    }


    // Process tables
    for (const currTable of currSchema.tables) {
      const prevEntry = prevTablesGlobal.get(currTable.id);

      if (!prevEntry) {
        // Table is new: CREATE_TABLE represents the creation of the schema object.
        // Inner columns/constraints do not get separate operations.
        operations.push({
          kind: "CREATE_TABLE",
          risk: "safe",
          schemaId: currSchema.id,
          schemaName: currSchema.name,
          tableId: currTable.id,
          tableName: currTable.name,
        });
      } else {
        const prevTable = prevEntry.table;
        const prevSchema = prevEntry.schema;

        // Detect schema change
        if (prevSchema.id !== currSchema.id) {
          operations.push({
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: currTable.id,
            tableName: prevTable.name,
            oldSchemaName: prevSchema.name,
            newSchemaName: currSchema.name,
          });
        }

        // Table existed: Compare columns, PK, FK, Unique constraints, and Indexes.

        // Detect table rename
        if (currTable.name !== prevTable.name) {
          operations.push({
            kind: "RENAME_TABLE",
            risk: "warning",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            tableId: currTable.id,
            oldName: prevTable.name,
            newName: currTable.name,
          });
        }

        const prevCols = new Map(prevTable.columns.map((c) => [c.id, c]));
        const currCols = new Map(currTable.columns.map((c) => [c.id, c]));

        // Columns additions, renames and alterations
        for (const currCol of currTable.columns) {
          const prevCol = prevCols.get(currCol.id);
          if (!prevCol) {
            operations.push({
              kind: "ADD_COLUMN",
              risk: "safe",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              columnId: currCol.id,
              columnName: currCol.name,
            });
          } else {
            // 1. Rename
            if (currCol.name !== prevCol.name) {
              operations.push({
                kind: "RENAME_COLUMN",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                columnId: currCol.id,
                oldName: prevCol.name,
                newName: currCol.name,
              });
            }

            // 2. ALTER_COLUMN_TYPE
            if (currCol.type !== prevCol.type) {
              operations.push({
                kind: "ALTER_COLUMN_TYPE",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                columnId: currCol.id,
                columnName: currCol.name,
                oldType: prevCol.type,
                newType: currCol.type,
              });
            }

            // 3. ALTER_COLUMN_SIZE
            if (
              currCol.type === prevCol.type &&
              (currCol.size !== prevCol.size || currCol.scale !== prevCol.scale)
            ) {
              let risk: "safe" | "warning" = "warning";
              if (
                currCol.scale === prevCol.scale &&
                typeof currCol.size === "number" &&
                typeof prevCol.size === "number" &&
                currCol.size > prevCol.size
              ) {
                risk = "safe";
              }
              operations.push({
                kind: "ALTER_COLUMN_SIZE",
                risk,
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                columnId: currCol.id,
                columnName: currCol.name,
                oldSize: prevCol.size,
                newSize: currCol.size,
                oldScale: prevCol.scale,
                newScale: currCol.scale,
              });
            }

            // 4. ALTER_COLUMN_NULLABILITY
            if (currCol.nullable !== prevCol.nullable) {
              const risk = !prevCol.nullable && currCol.nullable ? "safe" : "warning";
              operations.push({
                kind: "ALTER_COLUMN_NULLABILITY",
                risk,
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                columnId: currCol.id,
                columnName: currCol.name,
                oldNullable: prevCol.nullable,
                newNullable: currCol.nullable,
              });
            }

            // 5. ALTER_COLUMN_DEFAULT
            const defaultChanged = currCol.defaultValue !== prevCol.defaultValue || currCol.sequenceName !== prevCol.sequenceName;
            if (defaultChanged) {
              const oldDefault = prevCol.sequenceName ? `nextval('${prevCol.sequenceName}')` : prevCol.defaultValue;
              const newDefault = currCol.sequenceName ? `nextval('${currCol.sequenceName}')` : currCol.defaultValue;
              operations.push({
                kind: "ALTER_COLUMN_DEFAULT",
                risk: "safe",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                columnId: currCol.id,
                columnName: currCol.name,
                oldDefault,
                newDefault,
              });
            }
          }
        }

        // Columns drops
        for (const prevCol of prevTable.columns) {
          if (!currCols.has(prevCol.id)) {
            operations.push({
              kind: "DROP_COLUMN",
              risk: "destructive",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              columnId: prevCol.id,
              columnName: prevCol.name,
            });
          }
        }

        // Primary Key check
        const prevPkCols = prevTable.columns.filter((c) => c.primaryKey);
        const currPkCols = currTable.columns.filter((c) => c.primaryKey);

        if (prevPkCols.length === 0 && currPkCols.length > 0) {
          operations.push({
            kind: "ADD_PRIMARY_KEY",
            risk: "safe",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            tableId: currTable.id,
            tableName: currTable.name,
            columnIds: currPkCols.map((c) => c.id),
            columnNames: currPkCols.map((c) => c.name),
          });
        } else if (prevPkCols.length > 0 && currPkCols.length === 0) {
          operations.push({
            kind: "DROP_PRIMARY_KEY",
            risk: "destructive",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            tableId: currTable.id,
            tableName: currTable.name,
          });
        } else if (
          prevPkCols.length > 0 &&
          currPkCols.length > 0 &&
          (prevPkCols.length !== currPkCols.length ||
            prevPkCols.some((c, i) => c.id !== currPkCols[i].id))
        ) {
          operations.push({
            kind: "ALTER_PRIMARY_KEY",
            risk: "warning",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            tableId: currTable.id,
            tableName: currTable.name,
            oldName: `pk_${prevTable.name}`,
            newName: `pk_${currTable.name}`,
            columnNames: currPkCols.map((c) => c.name),
          });
        } else if (
          prevPkCols.length > 0 &&
          currPkCols.length > 0 &&
          currTable.name !== prevTable.name
        ) {
          operations.push({
            kind: "RENAME_PRIMARY_KEY",
            risk: "warning",
            schemaId: currSchema.id,
            schemaName: currSchema.name,
            tableId: currTable.id,
            tableName: currTable.name,
            oldName: `pk_${prevTable.name}`,
            newName: `pk_${currTable.name}`,
          });
        }

        // Foreign Keys additions, renames & drops
        const prevFks = new Map(prevTable.foreignKeys.map((fk) => [fk.id, fk]));
        const currFks = new Map(currTable.foreignKeys.map((fk) => [fk.id, fk]));

        for (const currFk of currTable.foreignKeys) {
          const prevFk = prevFks.get(currFk.id);
          if (!prevFk) {
            operations.push({
              kind: "ADD_FOREIGN_KEY",
              risk: "safe",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              foreignKeyId: currFk.id,
              foreignKeyName: currFk.name,
            });
          } else {
            const hasCompositionChanged = didForeignKeyChange(previousProject, currentProject, prevFk, currFk);
            if (hasCompositionChanged) {
              operations.push({
                kind: "ALTER_FOREIGN_KEY",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                foreignKeyId: currFk.id,
                oldName: prevFk.name,
                newName: currFk.name,
              });
            } else if (currFk.name !== prevFk.name) {
              operations.push({
                kind: "RENAME_FOREIGN_KEY",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                foreignKeyId: currFk.id,
                oldName: prevFk.name,
                newName: currFk.name,
              });
            }
          }
        }

        for (const prevFk of prevTable.foreignKeys) {
          if (!currFks.has(prevFk.id)) {
            operations.push({
              kind: "DROP_FOREIGN_KEY",
              risk: "destructive",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              foreignKeyId: prevFk.id,
              foreignKeyName: prevFk.name,
            });
          }
        }

        // Unique Constraints additions, renames & drops
        const prevUcs = new Map(prevTable.uniqueConstraints.map((uc) => [uc.id, uc]));
        const currUcs = new Map(currTable.uniqueConstraints.map((uc) => [uc.id, uc]));

        for (const currUc of currTable.uniqueConstraints) {
          const prevUc = prevUcs.get(currUc.id);
          if (!prevUc) {
            operations.push({
              kind: "ADD_UNIQUE_CONSTRAINT",
              risk: "safe",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              uniqueConstraintId: currUc.id,
              uniqueConstraintName: currUc.name,
            });
          } else {
            const hasCompositionChanged = didUniqueConstraintChange(prevUc, currUc);
            if (hasCompositionChanged) {
              operations.push({
                kind: "ALTER_UNIQUE_CONSTRAINT",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                uniqueConstraintId: currUc.id,
                oldName: prevUc.name,
                newName: currUc.name,
              });
            } else if (currUc.name !== prevUc.name) {
              operations.push({
                kind: "RENAME_UNIQUE_CONSTRAINT",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                uniqueConstraintId: currUc.id,
                oldName: prevUc.name,
                newName: currUc.name,
              });
            }
          }
        }

        for (const prevUc of prevTable.uniqueConstraints) {
          if (!currUcs.has(prevUc.id)) {
            operations.push({
              kind: "DROP_UNIQUE_CONSTRAINT",
              risk: "destructive",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              uniqueConstraintId: prevUc.id,
              uniqueConstraintName: prevUc.name,
            });
          }
        }

        // Indexes additions, renames & drops
        const prevIdxs = new Map(prevTable.indexes.map((idx) => [idx.id, idx]));
        const currIdxs = new Map(currTable.indexes.map((idx) => [idx.id, idx]));

        for (const currIdx of currTable.indexes) {
          const prevIdx = prevIdxs.get(currIdx.id);
          if (!prevIdx) {
            operations.push({
              kind: "ADD_INDEX",
              risk: "safe",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              indexId: currIdx.id,
              indexName: currIdx.name,
            });
          } else {
            const hasCompositionChanged = didIndexChange(prevIdx, currIdx);
            if (hasCompositionChanged) {
              operations.push({
                kind: "ALTER_INDEX",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                indexId: currIdx.id,
                oldName: prevIdx.name,
                newName: currIdx.name,
              });
            } else if (currIdx.name !== prevIdx.name) {
              operations.push({
                kind: "RENAME_INDEX",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                indexId: currIdx.id,
                oldName: prevIdx.name,
                newName: currIdx.name,
              });
            }
          }
        }

        for (const prevIdx of prevTable.indexes) {
          if (!currIdxs.has(prevIdx.id)) {
            operations.push({
              kind: "DROP_INDEX",
              risk: "destructive",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              indexId: prevIdx.id,
              indexName: prevIdx.name,
            });
          }
        }

        // CHECK constraints additions, renames, alterations & drops
        const prevChecks = new Map((prevTable.checkConstraints ?? []).map((chk) => [chk.id, chk]));
        const currChecks = new Map((currTable.checkConstraints ?? []).map((chk) => [chk.id, chk]));

        for (const currChk of (currTable.checkConstraints ?? [])) {
          const prevChk = prevChecks.get(currChk.id);
          if (!prevChk) {
            operations.push({
              kind: "ADD_CHECK_CONSTRAINT",
              risk: "warning",
              schemaId: currSchema.id,
              schemaName: currSchema.name,
              tableId: currTable.id,
              tableName: currTable.name,
              constraintId: currChk.id,
              constraintName: currChk.name,
              expression: currChk.expression,
              columnIds: currChk.columnIds,
            });
          } else {
            const nameChanged = currChk.name !== prevChk.name;
            const expressionChanged = (currChk.expression ?? "").trim() !== (prevChk.expression ?? "").trim();
            const columnIdsChanged = !areColumnIdsEqual(currChk.columnIds, prevChk.columnIds);

            if (nameChanged || expressionChanged || columnIdsChanged) {
              operations.push({
                kind: "ALTER_CHECK_CONSTRAINT",
                risk: "warning",
                schemaId: currSchema.id,
                schemaName: currSchema.name,
                tableId: currTable.id,
                tableName: currTable.name,
                oldSchemaName: prevSchema.name,
                oldTableName: prevTable.name,
                constraintId: currChk.id,
                oldConstraintName: prevChk.name,
                newConstraintName: currChk.name,
                oldExpression: prevChk.expression,
                newExpression: currChk.expression,
                oldColumnIds: prevChk.columnIds,
                newColumnIds: currChk.columnIds,
              });
            }
          }
        }

        for (const prevChk of (prevTable.checkConstraints ?? [])) {
          if (!currChecks.has(prevChk.id)) {
            operations.push({
              kind: "DROP_CHECK_CONSTRAINT",
              risk: "destructive",
              schemaId: prevSchema.id,
              schemaName: prevSchema.name,
              tableId: prevTable.id,
              tableName: prevTable.name,
              constraintId: prevChk.id,
              constraintName: prevChk.name,
              expression: prevChk.expression,
              columnIds: prevChk.columnIds,
            });
          }
        }
      }
    }

  }

  // Detect table drops
  for (const [prevTableId, prevEntry] of prevTablesGlobal.entries()) {
    if (!currTablesGlobal.has(prevTableId)) {
      operations.push({
        kind: "DROP_TABLE",
        risk: "destructive",
        schemaId: prevEntry.schema.id,
        schemaName: prevEntry.schema.name,
        tableId: prevTableId,
        tableName: prevEntry.table.name,
      });
    }
  }

  return {
    operations,
    unsupportedOperations,
  };
}
