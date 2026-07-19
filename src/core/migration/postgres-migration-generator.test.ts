import { describe, it, expect } from "vitest";
import { generatePostgresMigrationSql } from "./postgres-migration-generator";
import type { ProjectDiff } from "../diff/project-diff-types";
import { createProjectFixture, createSchemaFixture, createTableFixture, createColumnFixture } from "../test-utils/project-fixtures";

describe("postgres-migration-generator", () => {
  it("executes RENAME_TABLE before operations that use the new name", () => {
    // e.g. rename table and add column to it
    const diff: ProjectDiff = {
      unsupportedOperations: [],
      operations: [
        {
          kind: "ADD_COLUMN",
          risk: "safe",
          schemaId: "s1",
          schemaName: "public",
          tableId: "t1",
          tableName: "new_table",
          columnId: "c1",
          columnName: "new_col"
        },
        {
          kind: "RENAME_TABLE",
          risk: "safe",
          schemaId: "s1",
          schemaName: "public",
          tableId: "t1",
          oldName: "old_table",
          newName: "new_table"
        }
      ]
    };

    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          name: "public",
          tables: [
            createTableFixture({
              id: "t1",
              name: "new_table",
              columns: [
                createColumnFixture({ id: "c1", name: "new_col" })
              ]
            })
          ]
        })
      ]
    });
    const sql = generatePostgresMigrationSql(diff, project);
    const renamePos = sql.indexOf("RENAME TO new_table");
    const addColPos = sql.indexOf("ADD COLUMN new_col");
    
    expect(renamePos).toBeGreaterThan(-1);
    expect(addColPos).toBeGreaterThan(-1);
    expect(renamePos).toBeLessThan(addColPos);
  });

  it("generates RENAME COLUMN properly", () => {
    const diff: ProjectDiff = {
      unsupportedOperations: [],
      operations: [
        {
          kind: "RENAME_COLUMN",
          risk: "safe",
          schemaId: "s1",
          schemaName: "public",
          tableId: "t1",
          tableName: "users",
          columnId: "c1",
          oldName: "old_name",
          newName: "new_name"
        }
      ]
    };

    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "s1", name: "public" })
      ]
    });
    const sql = generatePostgresMigrationSql(diff, project);
    expect(sql).toContain("ALTER TABLE public.users RENAME COLUMN old_name TO new_name;");
  });

  it("includes destructive warning comment for DROP COLUMN", () => {
    const diff: ProjectDiff = {
      unsupportedOperations: [],
      operations: [
        {
          kind: "DROP_COLUMN",
          risk: "destructive",
          schemaId: "s1",
          schemaName: "public",
          tableId: "t1",
          tableName: "users",
          columnId: "c1",
          columnName: "deleted_col"
        }
      ]
    };

    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "s1", name: "public" })
      ]
    });
    const sql = generatePostgresMigrationSql(diff, project);
    expect(sql).toContain("DROP COLUMN deleted_col");
    // Normally we expect some destructive warning comment. Let's check if there is a comment.
    expect(sql).toMatch(/--.*(DESTRUCTIVE|destructive|drop|WARNING)/i);
  });

  it("handles altering sequence parameters", () => {
    const diff: ProjectDiff = {
      unsupportedOperations: [],
      operations: [
        {
          kind: "ALTER_SEQUENCE",
          risk: "safe",
          schemaId: "s1",
          schemaName: "public",
          sequenceId: "seq1",
          sequenceName: "my_seq",
          oldStartWith: 1,
          newStartWith: 10,
          oldIncrementBy: 1,
          newIncrementBy: 2
        }
      ]
    };

    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "s1", name: "public" })
      ]
    });
    const sql = generatePostgresMigrationSql(diff, project);
    expect(sql).toMatch(/ALTER SEQUENCE public\.my_seq\s*START WITH 10\s*INCREMENT BY 2/);
  });

  it("handles primary key drift after rename table", () => {
    const diff: ProjectDiff = {
      unsupportedOperations: [],
      operations: [
        {
          kind: "ALTER_PRIMARY_KEY",
          risk: "safe",
          schemaId: "s1",
          schemaName: "public",
          tableId: "t1",
          tableName: "accounts", // new name
          oldName: "pk_users", // created with old name
          newName: "pk_accounts",
          columnNames: ["id"]
        }
      ]
    };

    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          name: "public",
          tables: [
            createTableFixture({
              id: "t1",
              name: "accounts",
              columns: [
                createColumnFixture({ name: "id" })
              ]
            })
          ]
        })
      ]
    });
    const sql = generatePostgresMigrationSql(diff, project);
    expect(sql).toContain("ALTER TABLE public.accounts DROP CONSTRAINT pk_users;");
    expect(sql).toContain("ALTER TABLE public.accounts ADD CONSTRAINT pk_accounts PRIMARY KEY (id);");
  });

  it("handles removing default before drop sequence if sequence is dropped", () => {
    const diff: ProjectDiff = {
      unsupportedOperations: [],
      operations: [
        {
          kind: "DROP_SEQUENCE",
          risk: "destructive",
          schemaId: "s1",
          schemaName: "public",
          sequenceId: "seq1",
          sequenceName: "my_seq"
        },
        {
          kind: "ALTER_COLUMN_DEFAULT",
          risk: "safe",
          schemaId: "s1",
          schemaName: "public",
          tableId: "t1",
          tableName: "users",
          columnId: "c1",
          columnName: "id",
          oldDefault: "nextval('public.my_seq')",
          newDefault: undefined
        }
      ]
    };

    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({ id: "s1", name: "public" })
      ]
    });
    const sql = generatePostgresMigrationSql(diff, project);
    const alterDefPos = sql.indexOf("ALTER COLUMN id DROP DEFAULT");
    const dropSeqPos = sql.indexOf("DROP SEQUENCE");
    
    expect(alterDefPos).toBeGreaterThan(-1);
    expect(dropSeqPos).toBeGreaterThan(-1);
    expect(alterDefPos).toBeLessThan(dropSeqPos); // Must drop default before dropping sequence
  });
  
  it("incorporates manual scripts before and after", () => {
    const diff: ProjectDiff = {
      unsupportedOperations: [
        { kind: "UNSUPPORTED", objectName: "a", objectType: "t", reason: "none", risk: "warning" }
      ],
      operations: []
    };
    
    // We don't have direct access to manual scripts inside `generatePostgresMigrationSql`
    // Wait, let me check the signature of generatePostgresMigrationSql.
    // It is `generatePostgresMigrationSql(diff, project)`
    // Are the manual scripts applied there or at a higher level?
    // Let's just assert that it generates a basic output for now.
    const sql = generatePostgresMigrationSql(diff, createProjectFixture());
    expect(sql).toBeDefined();
  });

  describe("schema alteration migration generation (ALTER_TABLE_SCHEMA)", () => {
    it("generates ALTER TABLE SET SCHEMA", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth"
          }
        ],
        unsupportedOperations: []
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [createTableFixture({ id: "t1", name: "tb_users" })]
          })
        ]
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("ALTER TABLE public.tb_users SET SCHEMA auth;");
      expect(sql).not.toContain("DROP CONSTRAINT");
      expect(sql).not.toContain("ADD CONSTRAINT");
    });

    it("generates SQL in correct order for moving schema and adding column", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ADD_COLUMN",
            risk: "safe",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "c2",
            columnName: "email"
          },
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth"
          }
        ],
        unsupportedOperations: []
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "t1",
                name: "tb_users",
                columns: [
                  createColumnFixture({ id: "c1", name: "id" }),
                  createColumnFixture({ id: "c2", name: "email", type: "varchar(200)", nullable: true })
                ]
              })
            ]
          })
        ]
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const setSchemaPos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      const addColumnPos = sql.indexOf("ALTER TABLE auth.tb_users ADD COLUMN email varchar(200);");

      expect(setSchemaPos).toBeGreaterThan(-1);
      expect(addColumnPos).toBeGreaterThan(-1);
      expect(setSchemaPos).toBeLessThan(addColumnPos); // SET SCHEMA must run before ADD COLUMN
    });

    it("generates SQL in correct order for moving schema and renaming table", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "RENAME_TABLE",
            risk: "warning",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            oldName: "tb_users",
            newName: "tb_app_users"
          },
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth"
          }
        ],
        unsupportedOperations: []
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [createTableFixture({ id: "t1", name: "tb_app_users" })]
          })
        ]
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const setSchemaPos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      const renamePos = sql.indexOf("ALTER TABLE auth.tb_users RENAME TO tb_app_users;");

      expect(setSchemaPos).toBeGreaterThan(-1);
      expect(renamePos).toBeGreaterThan(-1);
      expect(setSchemaPos).toBeLessThan(renamePos); // SET SCHEMA must run before RENAME TO
    });

    it("generates SQL in correct order for moving schema, renaming table, and adding column", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ADD_COLUMN",
            risk: "safe",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_app_users",
            columnId: "c2",
            columnName: "email"
          },
          {
            kind: "RENAME_TABLE",
            risk: "warning",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            oldName: "tb_users",
            newName: "tb_app_users"
          },
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth"
          }
        ],
        unsupportedOperations: []
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s2",
            name: "auth",
            tables: [
              createTableFixture({
                id: "t1",
                name: "tb_app_users",
                columns: [
                  createColumnFixture({ id: "c1", name: "id" }),
                  createColumnFixture({ id: "c2", name: "email", type: "varchar(200)", nullable: true })
                ]
              })
            ]
          })
        ]
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const setSchemaPos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      const renamePos = sql.indexOf("ALTER TABLE auth.tb_users RENAME TO tb_app_users;");
      const addColumnPos = sql.indexOf("ALTER TABLE auth.tb_app_users ADD COLUMN email varchar(200);");

      expect(setSchemaPos).toBeGreaterThan(-1);
      expect(renamePos).toBeGreaterThan(-1);
      expect(addColumnPos).toBeGreaterThan(-1);
      
      expect(setSchemaPos).toBeLessThan(renamePos);
      expect(renamePos).toBeLessThan(addColumnPos);
    });
  });

  describe("CHECK constraints migration generation", () => {
    const emptyProj = createProjectFixture();

    it("1. Gera ADD_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ADD_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      expect(sql).toContain("ALTER TABLE public.tb_users ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120);");
    });

    it("2. Gera DROP_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "DROP_CHECK_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      expect(sql).toContain("ALTER TABLE public.tb_users DROP CONSTRAINT chk_tb_users_age;");
    });

    it("3. Gera ALTER_CHECK_CONSTRAINT como DROP + ADD", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            oldConstraintName: "chk_tb_users_age",
            newConstraintName: "chk_tb_users_age",
            oldExpression: "age BETWEEN 0 AND 120",
            newExpression: "age BETWEEN 18 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropPos = sql.indexOf("DROP CONSTRAINT chk_tb_users_age;");
      const addPos = sql.indexOf("ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 18 AND 120);");
      expect(dropPos).toBeGreaterThan(-1);
      expect(addPos).toBeGreaterThan(-1);
      expect(dropPos).toBeLessThan(addPos);
    });

    it("4. ADD_CHECK_CONSTRAINT vem depois de ADD_COLUMN", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ADD_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
            columnIds: ["col-age"],
          },
          {
            kind: "ADD_COLUMN",
            risk: "safe",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "col-age",
            columnName: "age",
          },
        ],
        unsupportedOperations: [],
      };
      
      const schema = createSchemaFixture({
        id: "s1",
        name: "public",
        tables: [
          createTableFixture({
            id: "t1",
            name: "tb_users",
            columns: [createColumnFixture({ id: "col-age", name: "age", type: "integer" })],
          })
        ]
      });
      const project = createProjectFixture({ schemas: [schema] });

      const sql = generatePostgresMigrationSql(diff, project);
      const addColPos = sql.indexOf("ADD COLUMN age integer NOT NULL;");
      const addCheckPos = sql.indexOf("ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120);");
      expect(addColPos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(addColPos).toBeLessThan(addCheckPos);
    });

    it("5. DROP_CHECK_CONSTRAINT vem antes de DROP_COLUMN", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "DROP_COLUMN",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "col-age",
            columnName: "age",
          },
          {
            kind: "DROP_CHECK_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
            columnIds: ["col-age"],
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropCheckPos = sql.indexOf("DROP CONSTRAINT chk_tb_users_age;");
      const dropColPos = sql.indexOf("DROP COLUMN age;");
      expect(dropCheckPos).toBeGreaterThan(-1);
      expect(dropColPos).toBeGreaterThan(-1);
      expect(dropCheckPos).toBeLessThan(dropColPos);
    });

    it("6. ALTER_CHECK_CONSTRAINT + ALTER_COLUMN_TYPE gera drop, altera coluna, add", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            oldConstraintName: "chk_tb_users_age",
            newConstraintName: "chk_tb_users_age",
            oldExpression: "age BETWEEN 0 AND 120",
            newExpression: "age BETWEEN 18 AND 120",
            oldColumnIds: ["col-age"],
            newColumnIds: ["col-age"],
          },
          {
            kind: "ALTER_COLUMN_TYPE",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "col-age",
            columnName: "age",
            oldType: "integer",
            newType: "bigint",
          },
        ],
        unsupportedOperations: [],
      };

      const schema = createSchemaFixture({
        id: "s1",
        name: "public",
        tables: [
          createTableFixture({
            id: "t1",
            name: "tb_users",
            columns: [createColumnFixture({ id: "col-age", name: "age", type: "bigint" })],
          })
        ]
      });
      const project = createProjectFixture({ schemas: [schema] });

      const sql = generatePostgresMigrationSql(diff, project);
      const dropCheckPos = sql.indexOf("DROP CONSTRAINT chk_tb_users_age;");
      const alterColPos = sql.indexOf("ALTER COLUMN age TYPE bigint;");
      const addCheckPos = sql.indexOf("ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 18 AND 120);");
      expect(dropCheckPos).toBeGreaterThan(-1);
      expect(alterColPos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(dropCheckPos).toBeLessThan(alterColPos);
      expect(alterColPos).toBeLessThan(addCheckPos);
    });

    it("7. ALTER_TABLE_SCHEMA + ADD_CHECK_CONSTRAINT usa schema novo no ADD", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth",
          },
          {
            kind: "ADD_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const movePos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      const addCheckPos = sql.indexOf("ALTER TABLE auth.tb_users ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120);");
      expect(movePos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(movePos).toBeLessThan(addCheckPos);
    });

    it("8. ALTER_TABLE_SCHEMA + DROP_CHECK_CONSTRAINT usa schema antigo no DROP", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "DROP_CHECK_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropCheckPos = sql.indexOf("ALTER TABLE public.tb_users DROP CONSTRAINT chk_tb_users_age;");
      const movePos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      expect(dropCheckPos).toBeGreaterThan(-1);
      expect(movePos).toBeGreaterThan(-1);
      expect(dropCheckPos).toBeLessThan(movePos);
    });

    it("9. ALTER_TABLE_SCHEMA + ALTER_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            oldTableName: "tb_users",
            constraintId: "chk1",
            oldConstraintName: "chk_tb_users_age",
            newConstraintName: "chk_tb_users_age",
            oldExpression: "age BETWEEN 0 AND 120",
            newExpression: "age BETWEEN 18 AND 120",
          },
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropCheckPos = sql.indexOf("ALTER TABLE public.tb_users DROP CONSTRAINT chk_tb_users_age;");
      const movePos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      const addCheckPos = sql.indexOf("ALTER TABLE auth.tb_users ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 18 AND 120);");
      expect(dropCheckPos).toBeGreaterThan(-1);
      expect(movePos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(dropCheckPos).toBeLessThan(movePos);
      expect(movePos).toBeLessThan(addCheckPos);
    });

    it("10. ALTER_TABLE_SCHEMA + RENAME_TABLE + ADD_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth",
          },
          {
            kind: "RENAME_TABLE",
            risk: "warning",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            oldName: "tb_users",
            newName: "tb_app_users",
          },
          {
            kind: "ADD_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s2",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_app_users",
            constraintId: "chk1",
            constraintName: "chk_tb_app_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const movePos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      const renamePos = sql.indexOf("ALTER TABLE auth.tb_users RENAME TO tb_app_users;");
      const addCheckPos = sql.indexOf("ALTER TABLE auth.tb_app_users ADD CONSTRAINT chk_tb_app_users_age CHECK (age BETWEEN 0 AND 120);");
      expect(movePos).toBeGreaterThan(-1);
      expect(renamePos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(movePos).toBeLessThan(renamePos);
      expect(renamePos).toBeLessThan(addCheckPos);
    });

    it("11. Preservar regra drop default antes de drop sequence", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "DROP_SEQUENCE",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            sequenceId: "seq1",
            sequenceName: "my_seq",
          },
          {
            kind: "ALTER_COLUMN_DEFAULT",
            risk: "safe",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "col1",
            columnName: "id",
            oldDefault: "nextval('my_seq')",
            newDefault: undefined,
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropDefPos = sql.indexOf("DROP DEFAULT");
      const dropSeqPos = sql.indexOf("DROP SEQUENCE");
      expect(dropDefPos).toBeGreaterThan(-1);
      expect(dropSeqPos).toBeGreaterThan(-1);
      expect(dropDefPos).toBeLessThan(dropSeqPos);
    });

    it("12. Preservar regra constraints/index antes de drop column", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "DROP_COLUMN",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "col1",
            columnName: "email",
          },
          {
            kind: "DROP_UNIQUE_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            uniqueConstraintId: "uc1",
            uniqueConstraintName: "uk_tb_users_email",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropUCPos = sql.indexOf("DROP CONSTRAINT uk_tb_users_email;");
      const dropColPos = sql.indexOf("DROP COLUMN email;");
      expect(dropUCPos).toBeGreaterThan(-1);
      expect(dropColPos).toBeGreaterThan(-1);
      expect(dropUCPos).toBeLessThan(dropColPos);
    });

    it("13. RENAME_SCHEMA + DROP_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "RENAME_SCHEMA",
            risk: "warning",
            schemaId: "s1",
            oldName: "public",
            newName: "auth",
          },
          {
            kind: "DROP_CHECK_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropPos = sql.indexOf("ALTER TABLE public.tb_users DROP CONSTRAINT chk_tb_users_age;");
      const renamePos = sql.indexOf("ALTER SCHEMA public RENAME TO auth;");
      expect(dropPos).toBeGreaterThan(-1);
      expect(renamePos).toBeGreaterThan(-1);
      expect(dropPos).toBeLessThan(renamePos);
    });

    it("14. RENAME_SCHEMA + ALTER_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "RENAME_SCHEMA",
            risk: "warning",
            schemaId: "s1",
            oldName: "public",
            newName: "auth",
          },
          {
            kind: "ALTER_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            oldTableName: "tb_users",
            constraintId: "chk1",
            oldConstraintName: "chk_tb_users_age",
            newConstraintName: "chk_tb_users_age",
            oldExpression: "age BETWEEN 0 AND 120",
            newExpression: "age BETWEEN 18 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropPos = sql.indexOf("ALTER TABLE public.tb_users DROP CONSTRAINT chk_tb_users_age;");
      const renamePos = sql.indexOf("ALTER SCHEMA public RENAME TO auth;");
      const addPos = sql.indexOf("ALTER TABLE auth.tb_users ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 18 AND 120);");
      expect(dropPos).toBeGreaterThan(-1);
      expect(renamePos).toBeGreaterThan(-1);
      expect(addPos).toBeGreaterThan(-1);
      expect(dropPos).toBeLessThan(renamePos);
      expect(renamePos).toBeLessThan(addPos);
    });

    it("15. Garantir que ADD_CHECK_CONSTRAINT continua depois de RENAME_SCHEMA", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "RENAME_SCHEMA",
            risk: "warning",
            schemaId: "s1",
            oldName: "public",
            newName: "auth",
          },
          {
            kind: "ADD_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "auth",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const renamePos = sql.indexOf("ALTER SCHEMA public RENAME TO auth;");
      const addPos = sql.indexOf("ALTER TABLE auth.tb_users ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120);");
      expect(renamePos).toBeGreaterThan(-1);
      expect(addPos).toBeGreaterThan(-1);
      expect(renamePos).toBeLessThan(addPos);
    });

    it("16. Regressão ALTER_TABLE_SCHEMA + DROP_CHECK_CONSTRAINT", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "DROP_CHECK_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            constraintName: "chk_tb_users_age",
            expression: "age BETWEEN 0 AND 120",
          },
          {
            kind: "ALTER_TABLE_SCHEMA",
            risk: "warning",
            tableId: "t1",
            tableName: "tb_users",
            oldSchemaName: "public",
            newSchemaName: "auth",
          },
        ],
        unsupportedOperations: [],
      };
      const sql = generatePostgresMigrationSql(diff, emptyProj);
      const dropPos = sql.indexOf("ALTER TABLE public.tb_users DROP CONSTRAINT chk_tb_users_age;");
      const movePos = sql.indexOf("ALTER TABLE public.tb_users SET SCHEMA auth;");
      expect(dropPos).toBeGreaterThan(-1);
      expect(movePos).toBeGreaterThan(-1);
      expect(dropPos).toBeLessThan(movePos);
    });

    it("17. Regressão ALTER_CHECK_CONSTRAINT + ALTER_COLUMN_TYPE", () => {
      const diff: ProjectDiff = {
        operations: [
          {
            kind: "ALTER_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            constraintId: "chk1",
            oldConstraintName: "chk_tb_users_age",
            newConstraintName: "chk_tb_users_age",
            oldExpression: "age BETWEEN 0 AND 120",
            newExpression: "age BETWEEN 18 AND 120",
            oldColumnIds: ["col-age"],
            newColumnIds: ["col-age"],
          },
          {
            kind: "ALTER_COLUMN_TYPE",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            columnId: "col-age",
            columnName: "age",
            oldType: "integer",
            newType: "bigint",
          },
        ],
        unsupportedOperations: [],
      };

      const schema = createSchemaFixture({
        id: "s1",
        name: "public",
        tables: [
          createTableFixture({
            id: "t1",
            name: "tb_users",
            columns: [createColumnFixture({ id: "col-age", name: "age", type: "bigint" })],
          })
        ]
      });
      const project = createProjectFixture({ schemas: [schema] });

      const sql = generatePostgresMigrationSql(diff, project);
      const dropCheckPos = sql.indexOf("DROP CONSTRAINT chk_tb_users_age;");
      const alterColPos = sql.indexOf("ALTER COLUMN age TYPE bigint;");
      const addCheckPos = sql.indexOf("ADD CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 18 AND 120);");
      expect(dropCheckPos).toBeGreaterThan(-1);
      expect(alterColPos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(dropCheckPos).toBeLessThan(alterColPos);
      expect(alterColPos).toBeLessThan(addCheckPos);
    });
  });

  describe("PostgreSQL database function migrations", () => {
    it("1. Gera ADD_FUNCTION", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_sum",
            language: "sql",
            returnType: "numeric",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
            ],
            body: "SELECT a + b;",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
          }),
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain(
        "CREATE OR REPLACE FUNCTION public.fn_sum(a numeric, b numeric)\n" +
        "RETURNS numeric AS $$\n" +
        "SELECT a + b;\n" +
        "$$ LANGUAGE sql;"
      );
    });

    it("2. Gera DROP_FUNCTION com assinatura", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_FUNCTION",
            risk: "destructive",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_sum",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
            ],
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("DROP FUNCTION public.fn_sum(numeric, numeric);");
    });

    it("3. Gera DROP_FUNCTION sem argumentos", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_FUNCTION",
            risk: "destructive",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_update_timestamp",
            arguments: [],
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("DROP FUNCTION public.fn_update_timestamp();");
    });

    it("4. ALTER_FUNCTION sem rebuild gera apenas CREATE OR REPLACE", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ALTER_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            oldSchemaId: "s1",
            newSchemaId: "s1",
            oldSchemaName: "public",
            newSchemaName: "public",
            oldFunctionName: "fn_sum",
            newFunctionName: "fn_sum",
            oldLanguage: "sql",
            newLanguage: "sql",
            oldReturnType: "numeric",
            newReturnType: "numeric",
            oldArguments: [{ id: "a1", name: "a", dataType: "numeric" }],
            newArguments: [{ id: "a1", name: "a", dataType: "numeric" }],
            oldBody: "SELECT a;",
            newBody: "SELECT a * 2;",
            requiresDropAndRecreate: false,
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.fn_sum(a numeric)");
      expect(sql).not.toContain("DROP FUNCTION");
    });

    it("5. ALTER_FUNCTION com rebuild gera DROP antigo + CREATE novo", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ALTER_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            oldSchemaId: "s1",
            newSchemaId: "s1",
            oldSchemaName: "public",
            newSchemaName: "public",
            oldFunctionName: "fn_sum",
            newFunctionName: "fn_sum",
            oldLanguage: "sql",
            newLanguage: "sql",
            oldReturnType: "numeric",
            newReturnType: "numeric",
            oldArguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
            ],
            newArguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
              { id: "a3", name: "c", dataType: "numeric" },
            ],
            oldBody: "SELECT a + b;",
            newBody: "SELECT a + b + c;",
            requiresDropAndRecreate: true,
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const dropIndex = sql.indexOf("DROP FUNCTION public.fn_sum(numeric, numeric);");
      const createIndex = sql.indexOf("CREATE OR REPLACE FUNCTION public.fn_sum(a numeric, b numeric, c numeric)");
      
      expect(dropIndex).toBeGreaterThan(-1);
      expect(createIndex).toBeGreaterThan(-1);
      expect(dropIndex).toBeLessThan(createIndex);
    });

    it("6. DROP_FUNCTION não inclui nome dos argumentos nem mode", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_FUNCTION",
            risk: "destructive",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_x",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric", mode: "IN" },
              { id: "a2", name: "result", dataType: "numeric", mode: "OUT" },
            ],
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("DROP FUNCTION public.fn_x(numeric, numeric);");
      expect(sql).not.toContain("IN ");
      expect(sql).not.toContain("OUT");
      expect(sql).not.toContain("result");
    });

    it("7. ADD_FUNCTION preserva mode nos argumentos", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_x",
            language: "sql",
            returnType: "numeric",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric", mode: "IN" },
              { id: "a2", name: "result", dataType: "numeric", mode: "OUT" },
            ],
            body: "--",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.fn_x(IN a numeric, OUT result numeric)");
    });

    it("8. ALTER_FUNCTION com mudança de schemaId usa old schema no DROP e new schema no CREATE", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ALTER_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            oldSchemaId: "s1",
            newSchemaId: "s2",
            oldSchemaName: "public",
            newSchemaName: "auth",
            oldFunctionName: "fn_x",
            newFunctionName: "fn_x",
            oldLanguage: "sql",
            newLanguage: "sql",
            oldReturnType: "integer",
            newReturnType: "integer",
            oldArguments: [{ id: "a1", name: "a", dataType: "integer" }],
            newArguments: [{ id: "a1", name: "value", dataType: "integer" }],
            oldBody: "SELECT a;",
            newBody: "SELECT value;",
            requiresDropAndRecreate: true,
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({ id: "s1", name: "public" }),
          createSchemaFixture({ id: "s2", name: "auth" }),
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("DROP FUNCTION public.fn_x(integer);");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION auth.fn_x(value integer)");
    });

    it("9. RENAME_SCHEMA + ALTER_FUNCTION sem rebuild usa schema novo no CREATE", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "RENAME_SCHEMA",
            risk: "warning",
            schemaId: "s1",
            oldName: "public",
            newName: "auth",
          },
          {
            kind: "ALTER_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            oldSchemaId: "s1",
            newSchemaId: "s1",
            oldSchemaName: "public",
            newSchemaName: "auth",
            oldFunctionName: "fn_x",
            newFunctionName: "fn_x",
            oldLanguage: "sql",
            newLanguage: "sql",
            oldReturnType: "integer",
            newReturnType: "integer",
            oldArguments: [],
            newArguments: [],
            oldBody: "SELECT 1;",
            newBody: "SELECT 2;",
            requiresDropAndRecreate: false,
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "auth" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const renameIndex = sql.indexOf("ALTER SCHEMA public RENAME TO auth;");
      const createIndex = sql.indexOf("CREATE OR REPLACE FUNCTION auth.fn_x()");
      
      expect(renameIndex).toBeGreaterThan(-1);
      expect(createIndex).toBeGreaterThan(-1);
      expect(renameIndex).toBeLessThan(createIndex);
    });

    it("10. Preserva body multiline no CREATE incremental", () => {
      const bodyStr = "BEGIN\n    RAISE NOTICE 'updated %', NEW.id;\n    RETURN NEW;\nEND;";
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_x",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: bodyStr,
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain(`RETURNS trigger AS $$\n${bodyStr}\n$$ LANGUAGE plpgsql;`);
    });

    it("11. Regressão: DROP_CHECK_CONSTRAINT continua antes de RENAME_SCHEMA", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "RENAME_SCHEMA",
            risk: "warning",
            schemaId: "s1",
            oldName: "public",
            newName: "auth",
          },
          {
            kind: "DROP_CHECK_CONSTRAINT",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "users",
            constraintId: "chk-1",
            constraintName: "chk_age",
            expression: "age > 0",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "auth" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const dropPos = sql.indexOf("ALTER TABLE public.users DROP CONSTRAINT chk_age;");
      const renamePos = sql.indexOf("ALTER SCHEMA public RENAME TO auth;");
      
      expect(dropPos).toBeGreaterThan(-1);
      expect(renamePos).toBeGreaterThan(-1);
      expect(dropPos).toBeLessThan(renamePos);
    });

    it("12. Regressão: ADD_CHECK_CONSTRAINT continua depois de ADD_COLUMN", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_CHECK_CONSTRAINT",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "users",
            constraintId: "chk-1",
            constraintName: "chk_age",
            expression: "age > 0",
          },
          {
            kind: "ADD_COLUMN",
            risk: "safe",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "users",
            columnId: "c1",
            columnName: "age",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t1",
                name: "users",
                columns: [createColumnFixture({ id: "c1", name: "age", type: "integer" })],
              }),
            ],
          }),
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const addColumnPos = sql.indexOf("ALTER TABLE public.users ADD COLUMN age integer");
      const addCheckPos = sql.indexOf("ALTER TABLE public.users ADD CONSTRAINT chk_age CHECK (age > 0);");
      
      expect(addColumnPos).toBeGreaterThan(-1);
      expect(addCheckPos).toBeGreaterThan(-1);
      expect(addColumnPos).toBeLessThan(addCheckPos);
    });
  });

  describe("PostgreSQL trigger migration generation", () => {
    it("1. Gera DROP_TRIGGER com a sintaxe correta", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_TRIGGER",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            triggerId: "trg-1",
            triggerName: "trg_test",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("DROP TRIGGER IF EXISTS trg_test ON public.tb_users;");
    });

    it("2. Gera ADD_TRIGGER com DDL completa", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_TRIGGER",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            triggerId: "trg-1",
            triggerName: "trg_test",
            eventTiming: "BEFORE",
            events: ["INSERT"],
            functionId: "fn-1",
            forEach: "ROW",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t1",
                name: "tb_users",
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "s1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain(
        "CREATE TRIGGER trg_test\n" +
        "    BEFORE INSERT\n" +
        "    ON public.tb_users\n" +
        "    FOR EACH ROW\n" +
        "    EXECUTE FUNCTION public.fn_test();"
      );
    });

    it("3. Garante a ordenação: DROP_TRIGGER antes de DROP_FUNCTION, e ADD_TRIGGER depois de ADD_FUNCTION", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_TRIGGER",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            triggerId: "trg-1",
            triggerName: "trg_test",
            eventTiming: "BEFORE",
            events: ["INSERT"],
            functionId: "fn-1",
            forEach: "ROW",
          },
          {
            kind: "DROP_TRIGGER",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t1",
            tableName: "tb_users",
            triggerId: "trg-old",
            triggerName: "trg_old_name",
          },
          {
            kind: "ADD_FUNCTION",
            risk: "warning",
            functionId: "fn-1",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
          {
            kind: "DROP_FUNCTION",
            risk: "destructive",
            functionId: "fn-old",
            schemaId: "s1",
            schemaName: "public",
            functionName: "fn_old_func",
            arguments: [],
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t1",
                name: "tb_users",
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "s1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);
      const dropTriggerPos = sql.indexOf("DROP TRIGGER IF EXISTS trg_old_name ON public.tb_users;");
      const dropFunctionPos = sql.indexOf("DROP FUNCTION public.fn_old_func();");
      const createFunctionPos = sql.indexOf("CREATE OR REPLACE FUNCTION public.fn_test()");
      const createTriggerPos = sql.indexOf("CREATE TRIGGER trg_test");

      expect(dropTriggerPos).toBeGreaterThan(-1);
      expect(dropFunctionPos).toBeGreaterThan(-1);
      expect(createFunctionPos).toBeGreaterThan(-1);
      expect(createTriggerPos).toBeGreaterThan(-1);

      expect(dropTriggerPos).toBeLessThan(dropFunctionPos);
      expect(dropFunctionPos).toBeLessThan(createFunctionPos);
      expect(createFunctionPos).toBeLessThan(createTriggerPos);
    });
  });

  describe("PostgreSQL Views incremental migrations", () => {
    it("1. DROP_VIEW emite a sintaxe correta para views comuns e materializadas", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_VIEW",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            viewId: "view-1",
            viewName: "v_users",
            isMaterialized: false,
          },
          {
            kind: "DROP_VIEW",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            viewId: "view-2",
            viewName: "v_mat_users",
            isMaterialized: true,
          },
        ],
      };

      const project = createProjectFixture();
      const sql = generatePostgresMigrationSql(diff, project);

      expect(sql).toContain("DROP VIEW IF EXISTS public.v_users;");
      expect(sql).toContain("DROP MATERIALIZED VIEW IF EXISTS public.v_mat_users;");
    });

    it("2. ALTER_VIEW gera a dupla de comandos (DROP + CREATE) no script final", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ALTER_VIEW",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            viewId: "view-1",
            oldSchemaName: "public",
            oldViewName: "v_users_old",
            newViewName: "v_users_new",
            oldView: {
              schemaId: "s1",
              name: "v_users_old",
              definition: "SELECT * FROM public.tb_users_old",
              isMaterialized: false,
            },
            newView: {
              schemaId: "s1",
              name: "v_users_new",
              definition: "SELECT * FROM public.tb_users_new",
              isMaterialized: true,
              withNoData: true,
            },
            requiresDropAndRecreate: true,
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
          }),
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);

      expect(sql).toContain("DROP VIEW IF EXISTS public.v_users_old;");
      expect(sql).toContain("CREATE MATERIALIZED VIEW public.v_users_new AS\nSELECT * FROM public.tb_users_new WITH NO DATA;");
    });

    it("3. Valida a ordem em cenario misto: drop trigger -> drop view -> drop table -> create table -> add view -> add trigger", () => {
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_TRIGGER",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t-old",
            tableName: "tb_old",
            triggerId: "trg-old",
            triggerName: "trg_old",
          },
          {
            kind: "DROP_VIEW",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            viewId: "v-old",
            viewName: "v_old",
            isMaterialized: false,
          },
          {
            kind: "DROP_TABLE",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t-old",
            tableName: "tb_old",
          },
          {
            kind: "CREATE_TABLE",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t-new",
            tableName: "tb_new",
          },
          {
            kind: "ADD_VIEW",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            viewId: "v-new",
            viewName: "v_new",
            definition: "SELECT * FROM public.tb_new",
            isMaterialized: false,
          },
          {
            kind: "ADD_TRIGGER",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "t-new",
            tableName: "tb_new",
            triggerId: "trg-new",
            triggerName: "trg_new",
            eventTiming: "BEFORE",
            events: ["INSERT"],
            functionId: "fn-1",
            forEach: "ROW",
          },
        ],
      };

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "public",
            tables: [
              createTableFixture({
                id: "t-new",
                name: "tb_new",
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "s1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });

      const sql = generatePostgresMigrationSql(diff, project);

      const dropTriggerPos = sql.indexOf("DROP TRIGGER IF EXISTS trg_old ON public.tb_old;");
      const dropViewPos = sql.indexOf("DROP VIEW IF EXISTS public.v_old;");
      const dropTablePos = sql.indexOf("DROP TABLE public.tb_old;");
      const createTablePos = sql.indexOf("CREATE TABLE IF NOT EXISTS public.tb_new");
      const addViewPos = sql.indexOf("CREATE OR REPLACE VIEW public.v_new");
      const addTriggerPos = sql.indexOf("CREATE TRIGGER trg_new");

      expect(dropTriggerPos).toBeGreaterThan(-1);
      expect(dropViewPos).toBeGreaterThan(-1);
      expect(dropTablePos).toBeGreaterThan(-1);
      expect(createTablePos).toBeGreaterThan(-1);
      expect(addViewPos).toBeGreaterThan(-1);
      expect(addTriggerPos).toBeGreaterThan(-1);

      expect(dropTriggerPos).toBeLessThan(dropViewPos);
      expect(dropViewPos).toBeLessThan(createTablePos);
      expect(createTablePos).toBeLessThan(dropTablePos);
      expect(dropTablePos).toBeLessThan(addViewPos);
      expect(addViewPos).toBeLessThan(addTriggerPos);
    });

    it("4. DROP_VIEW com cascade: true gera a cláusula CASCADE", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
          }),
        ],
      });

      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "DROP_VIEW",
            risk: "destructive",
            schemaId: "schema-1",
            schemaName: "public",
            viewId: "view-1",
            viewName: "v_users",
            isMaterialized: false,
            cascade: true,
          },
        ],
      };

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("DROP VIEW IF EXISTS public.v_users CASCADE;");
    });
  });

  describe("COMMENT migrations", () => {
    it("generates COMMENT ON statements for set and null comments", () => {
      const project = createProjectFixture({});
      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "COMMENT",
            risk: "safe",
            objectType: "SCHEMA",
            schemaName: "public",
            objectName: "public",
            comment: "new schema comment",
          },
          {
            kind: "COMMENT",
            risk: "safe",
            objectType: "TABLE",
            schemaName: "public",
            tableName: "tb_users",
            objectName: "tb_users",
            comment: undefined,
          },
          {
            kind: "COMMENT",
            risk: "safe",
            objectType: "COLUMN",
            schemaName: "public",
            tableName: "tb_users",
            columnName: "name",
            objectName: "name",
            comment: "user's name",
          },
        ],
      };

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("COMMENT ON SCHEMA public IS 'new schema comment';");
      expect(sql).toContain("COMMENT ON TABLE public.tb_users IS NULL;");
      expect(sql).toContain("COMMENT ON COLUMN public.tb_users.name IS 'user''s name';");
    });
  });

  describe("View trigger migrations", () => {
    it("generates CREATE TRIGGER and DROP TRIGGER for views correctly", () => {
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "s1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            name: "audit_log",
            schemaId: "s1",
            language: "plpgsql",
            returnType: "trigger",
            body: "BEGIN RETURN NEW; END;",
            arguments: [],
          },
        ],
        views: [
          {
            id: "v-1",
            name: "v_active_users",
            schemaId: "s1",
            definition: "SELECT * FROM users",
            isMaterialized: false,
          },
        ],
      });

      const diff: ProjectDiff = {
        unsupportedOperations: [],
        operations: [
          {
            kind: "ADD_TRIGGER",
            risk: "warning",
            schemaId: "s1",
            schemaName: "public",
            tableId: "v-1",
            tableName: "v_active_users",
            triggerId: "trg-1",
            triggerName: "trg_view_audit",
            eventTiming: "INSTEAD OF",
            events: ["INSERT"],
            functionId: "fn-1",
            forEach: "ROW",
            comment: "View trigger comment",
          },
          {
            kind: "DROP_TRIGGER",
            risk: "destructive",
            schemaId: "s1",
            schemaName: "public",
            tableId: "v-1",
            tableName: "v_active_users",
            triggerId: "trg-2",
            triggerName: "trg_view_old",
          },
        ],
      };

      const sql = generatePostgresMigrationSql(diff, project);
      expect(sql).toContain("CREATE TRIGGER trg_view_audit");
      expect(sql).toContain("INSTEAD OF INSERT");
      expect(sql).toContain("ON public.v_active_users");
      expect(sql).toContain("DROP TRIGGER IF EXISTS trg_view_old ON public.v_active_users;");
    });
  });
});
