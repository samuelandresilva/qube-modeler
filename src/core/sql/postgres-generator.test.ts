import { describe, it, expect } from "vitest";
import { generatePostgresSql } from "./postgres-generator";
import { createProjectFixture, createSchemaFixture, createTableFixture, createColumnFixture } from "../test-utils/project-fixtures";

describe("postgres-generator", () => {
  it("generates CREATE SCHEMA IF NOT EXISTS", () => {
    const project = createProjectFixture({
      schemas: [createSchemaFixture({ name: "my_schema" })]
    });
    const sql = generatePostgresSql(project);
    expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS my_schema;");
  });

  it("generates CREATE SEQUENCE IF NOT EXISTS", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          name: "public",
          sequences: [{ id: "seq1", name: "my_seq", startWith: 1, incrementBy: 1 }]
        })
      ]
    });
    const sql = generatePostgresSql(project);
    expect(sql).toMatch(/CREATE SEQUENCE IF NOT EXISTS public\.my_seq\s*START WITH 1\s*INCREMENT BY 1/);
  });

  it("creates tables without inline FKs (they are created afterwards)", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          name: "public",
          tables: [
            createTableFixture({
              name: "orders",
              columns: [createColumnFixture({ name: "user_id", type: "integer" })],
              foreignKeys: [
                {
                  id: "fk1",
                  name: "fk_user",
                  sourceColumns: ["user_id"],
                  targetSchema: "public",
                  targetTable: "users",
                  targetColumns: ["id"],
                }
              ]
            })
          ]
        })
      ]
    });
    const sql = generatePostgresSql(project);
    
    // Check that inside the CREATE TABLE there's no FOREIGN KEY text
    const createTablePart = sql.substring(sql.indexOf("CREATE TABLE"), sql.indexOf(";"));
    expect(createTablePart).not.toContain("FOREIGN KEY");
    
    // Check that it's added after via ALTER TABLE
    expect(sql).toContain("ALTER TABLE public.orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users (id);");
  });

  it("handles safe order for initial migration: schema, seq, table, constraint, index", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          name: "public",
          sequences: [{ id: "seq1", name: "my_seq", startWith: 1, incrementBy: 1 }],
          tables: [
            createTableFixture({
              name: "users",
              columns: [createColumnFixture({ name: "id", type: "integer" })],
              indexes: [{ id: "idx1", name: "idx_users_id", columns: ["id"] }]
            })
          ]
        })
      ]
    });
    const sql = generatePostgresSql(project);
    
    const schemaPos = sql.indexOf("CREATE SCHEMA");
    const seqPos = sql.indexOf("CREATE SEQUENCE");
    const tablePos = sql.indexOf("CREATE TABLE");
    const indexPos = sql.indexOf("CREATE INDEX");

    expect(schemaPos).toBeLessThan(seqPos);
    expect(seqPos).toBeLessThan(tablePos);
    expect(tablePos).toBeLessThan(indexPos);
  });

  it("resolves FKs for tables created afterwards", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          name: "public",
          tables: [
            createTableFixture({
              id: "t1",
              name: "a",
              columns: [createColumnFixture({ id: "c1", name: "b_id", type: "integer" })],
              foreignKeys: [
                {
                  id: "fk1",
                  name: "fk_b",
                  sourceColumns: ["b_id"],
                  targetSchema: "public",
                  targetTable: "b",
                  targetColumns: ["id"]
                }
              ]
            }),
            createTableFixture({
              id: "t2",
              name: "b",
              columns: [createColumnFixture({ id: "c2", name: "id", type: "integer" })]
            })
          ]
        })
      ]
    });

    const sql = generatePostgresSql(project);
    const createTableAPos = sql.indexOf("CREATE TABLE IF NOT EXISTS public.a");
    const createTableBPos = sql.indexOf("CREATE TABLE IF NOT EXISTS public.b");
    const alterTableFkPos = sql.indexOf("ALTER TABLE public.a ADD CONSTRAINT");

    // Both tables must be created before the FK constraint is added
    expect(createTableAPos).toBeLessThan(alterTableFkPos);
    expect(createTableBPos).toBeLessThan(alterTableFkPos);
  });

  it("handles circular FKs", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          name: "public",
          tables: [
            createTableFixture({
              id: "t1",
              name: "a",
              columns: [createColumnFixture({ id: "c1", name: "b_id", type: "integer" })],
              foreignKeys: [
                { id: "fk1", name: "fk_b", sourceColumns: ["b_id"], targetSchema: "public", targetTable: "b", targetColumns: ["id"] }
              ]
            }),
            createTableFixture({
              id: "t2",
              name: "b",
              columns: [createColumnFixture({ id: "c2", name: "a_id", type: "integer" })],
              foreignKeys: [
                { id: "fk2", name: "fk_a", sourceColumns: ["a_id"], targetSchema: "public", targetTable: "a", targetColumns: ["id"] }
              ]
            })
          ]
        })
      ]
    });

    const sql = generatePostgresSql(project);
    const createTableAPos = sql.indexOf("CREATE TABLE IF NOT EXISTS public.a");
    const createTableBPos = sql.indexOf("CREATE TABLE IF NOT EXISTS public.b");
    const alterTableFkPos = sql.indexOf("ADD CONSTRAINT");

    // Both tables must be created before ANY constraint is added
    expect(createTableAPos).toBeLessThan(alterTableFkPos);
    expect(createTableBPos).toBeLessThan(alterTableFkPos);
  });
  
  it("generates correct DEFAULT with sequence", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          name: "public",
          tables: [
            createTableFixture({
              name: "users",
              columns: [createColumnFixture({ name: "id", type: "integer", sequenceName: "my_seq" })]
            })
          ]
        })
      ]
    });
    const sql = generatePostgresSql(project);
    expect(sql).toContain("DEFAULT nextval('public.my_seq'::regclass)");
  });

  it("emits all CREATE SCHEMA statements before any other object", () => {
    const project = createProjectFixture({
      schemas: [
        createSchemaFixture({
          id: "s1",
          name: "public",
          tables: [createTableFixture({ id: "t1", name: "users" })]
        }),
        createSchemaFixture({
          id: "s2",
          name: "auth",
          tables: [createTableFixture({ id: "t2", name: "accounts" })]
        })
      ]
    });

    const sql = generatePostgresSql(project);
    const createSchemaPublicPos = sql.indexOf("CREATE SCHEMA IF NOT EXISTS public;");
    const createSchemaAuthPos = sql.indexOf("CREATE SCHEMA IF NOT EXISTS auth;");
    const createTableUsersPos = sql.indexOf("CREATE TABLE IF NOT EXISTS public.users");
    const createTableAccountsPos = sql.indexOf("CREATE TABLE IF NOT EXISTS auth.accounts");

    expect(createSchemaPublicPos).toBeGreaterThan(-1);
    expect(createSchemaAuthPos).toBeGreaterThan(-1);
    expect(createTableUsersPos).toBeGreaterThan(-1);
    expect(createTableAccountsPos).toBeGreaterThan(-1);

    expect(createSchemaPublicPos).toBeLessThan(createTableUsersPos);
    expect(createSchemaPublicPos).toBeLessThan(createTableAccountsPos);
    expect(createSchemaAuthPos).toBeLessThan(createTableUsersPos);
    expect(createSchemaAuthPos).toBeLessThan(createTableAccountsPos);
  });

  describe("CHECK constraints", () => {
    it("1. Gera CHECK constraint no CREATE TABLE", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age", type: "integer", nullable: false })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120)");
    });

    it("2. CHECK deve ser constraint nomeada de tabela, não inline", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-age", name: "age", type: "integer", nullable: false })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                    columnIds: ["col-age"],
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const sql = generatePostgresSql(project);
      // Coluna não deve ter CHECK inline
      expect(sql).toContain("    age integer NOT NULL");
      expect(sql).not.toContain("    age integer NOT NULL CHECK");
      // Deve aparecer em linha separada como constraint
      expect(sql).toContain("\n    CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120)");
    });

    it("3. Múltiplas CHECK constraints", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                columns: [
                  createColumnFixture({ id: "col-age", name: "age", type: "integer" }),
                  createColumnFixture({ id: "col-status", name: "status", type: "varchar" }),
                ],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_age",
                    expression: "age BETWEEN 0 AND 120",
                  },
                  {
                    id: "chk-2",
                    name: "chk_tb_users_status",
                    expression: "status IN ('ACTIVE', 'INACTIVE')",
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CONSTRAINT chk_tb_users_age CHECK (age BETWEEN 0 AND 120)");
      expect(sql).toContain("CONSTRAINT chk_tb_users_status CHECK (status IN ('ACTIVE', 'INACTIVE'))");
    });

    it("4. CHECK com regex PostgreSQL", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                columns: [createColumnFixture({ id: "col-email", name: "email", type: "varchar" })],
                checkConstraints: [
                  {
                    id: "chk-1",
                    name: "chk_tb_users_email",
                    expression: "email ~ '^[^@]+@[^@]+\\.[^@]+$'",
                  },
                ],
              }),
            ],
          }),
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CONSTRAINT chk_tb_users_email CHECK (email ~ '^[^@]+@[^@]+\\.[^@]+$')");
    });

    it("5. Tabela sem checkConstraints mantém SQL anterior", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                columns: [createColumnFixture({ name: "id", type: "integer" })],
                checkConstraints: [],
              }),
            ],
          }),
        ],
      });
      const sql = generatePostgresSql(project);
      // Não deve conter CONSTRAINT ... CHECK
      expect(sql).not.toContain("CHECK");
      // Não deve ter vírgulas sobrando ou linhas extras
      const expectedSql = [
        "CREATE TABLE IF NOT EXISTS public.tb_users",
        "(",
        "    id integer NOT NULL",
        ");"
      ].join("\n");
      expect(sql).toContain(expectedSql);
    });

    it("6. checkConstraints undefined não quebra generator", () => {
      const legacyTable = createTableFixture({
        name: "tb_users",
        columns: [createColumnFixture({ name: "id", type: "integer" })],
      });
      // Deletar explicitamente checkConstraints para simular tabela legada
      // @ts-expect-error forcing delete for testing legacy payload
      delete legacyTable.checkConstraints;

      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [legacyTable],
          }),
        ],
      });

      expect(() => generatePostgresSql(project)).not.toThrow();
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.tb_users");
    });
  });

  describe("PostgreSQL function SQL generation", () => {
    it("1. Gera function plpgsql sem argumentos", () => {
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_update_timestamp",
            language: "plpgsql" as const,
            returnType: "trigger",
            arguments: [],
            body: "BEGIN\n    NEW.updated_at = now();\n    RETURN NEW;\nEND;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(
        "CREATE OR REPLACE FUNCTION public.fn_update_timestamp()\n" +
        "RETURNS trigger AS $$\n" +
        "BEGIN\n" +
        "    NEW.updated_at = now();\n" +
        "    RETURN NEW;\n" +
        "END;\n" +
        "$$ LANGUAGE plpgsql;"
      );
    });

    it("2. Gera function sql com argumentos", () => {
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_sum",
            language: "sql" as const,
            returnType: "numeric",
            arguments: [
              { id: "a1", name: "a", dataType: "numeric" },
              { id: "a2", name: "b", dataType: "numeric" },
            ],
            body: "SELECT a + b;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(
        "CREATE OR REPLACE FUNCTION public.fn_sum(a numeric, b numeric)\n" +
        "RETURNS numeric AS $$\n" +
        "SELECT a + b;\n" +
        "$$ LANGUAGE sql;"
      );
    });

    it("3. Preserva ordem dos argumentos", () => {
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test_order",
            language: "sql" as const,
            returnType: "void",
            arguments: [
              { id: "a1", name: "first", dataType: "integer" },
              { id: "a2", name: "second", dataType: "text" },
              { id: "a3", name: "third", dataType: "boolean" },
            ],
            body: "--",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("public.fn_test_order(first integer, second text, third boolean)");
    });

    it("4. Gera argumento com mode", () => {
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test_mode",
            language: "sql" as const,
            returnType: "record",
            arguments: [
              { id: "a1", name: "amount", dataType: "numeric", mode: "IN" as const },
              { id: "a2", name: "result", dataType: "numeric", mode: "OUT" as const },
            ],
            body: "--",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("public.fn_test_mode(IN amount numeric, OUT result numeric)");
    });

    it("5. Preserva body como SQL livre", () => {
      const bodyStr = "BEGIN\n    RAISE NOTICE 'User % updated', NEW.id;\n    RETURN NEW;\nEND;";
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test_body",
            language: "plpgsql" as const,
            returnType: "trigger",
            arguments: [],
            body: bodyStr,
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(`RETURNS trigger AS $$\n${bodyStr}\n$$ LANGUAGE plpgsql;`);
    });

    it("6. Functions são geradas antes de CREATE TABLE", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "users",
                columns: [createColumnFixture({ name: "id", type: "integer" })],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test_order",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      const funcIndex = sql.indexOf("CREATE OR REPLACE FUNCTION");
      const tableIndex = sql.indexOf("CREATE TABLE");
      expect(funcIndex).toBeGreaterThan(-1);
      expect(tableIndex).toBeGreaterThan(-1);
      expect(funcIndex).toBeLessThan(tableIndex);
    });

    it("7. CREATE SCHEMA continua antes de function", () => {
      const project = createProjectFixture({
        schemas: [createSchemaFixture({ id: "schema-1", name: "public" })],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      const schemaIndex = sql.indexOf("CREATE SCHEMA IF NOT EXISTS public;");
      const funcIndex = sql.indexOf("CREATE OR REPLACE FUNCTION");
      expect(schemaIndex).toBeGreaterThan(-1);
      expect(funcIndex).toBeGreaterThan(-1);
      expect(schemaIndex).toBeLessThan(funcIndex);
    });

    it("8. CREATE SEQUENCE continua antes de function", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            sequences: [
              { id: "seq-1", name: "users_seq", startWith: 1, incrementBy: 1 },
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "sql" as const,
            returnType: "integer",
            arguments: [],
            body: "SELECT 1;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      const seqIndex = sql.indexOf("CREATE SEQUENCE");
      const funcIndex = sql.indexOf("CREATE OR REPLACE FUNCTION");
      expect(seqIndex).toBeGreaterThan(-1);
      expect(funcIndex).toBeGreaterThan(-1);
      expect(seqIndex).toBeLessThan(funcIndex);
    });

    it("9. Projeto sem functions mantém SQL válido", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "users",
                columns: [createColumnFixture({ name: "id", type: "integer" })],
              }),
            ],
          }),
        ],
        functions: [],
      });
      const sql = generatePostgresSql(project);
      expect(sql).not.toContain("CREATE OR REPLACE FUNCTION");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.users");
    });

    it("10. project.functions undefined não quebra generator", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "users",
                columns: [createColumnFixture({ name: "id", type: "integer" })],
              }),
            ],
          }),
        ],
      });
      // Simula projeto legado sem a propriedade functions
      // @ts-expect-error forcing delete for testing
      delete project.functions;

      expect(() => generatePostgresSql(project)).not.toThrow();
      const sql = generatePostgresSql(project);
      expect(sql).not.toContain("CREATE OR REPLACE FUNCTION");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.users");
    });
  });

  describe("PostgreSQL trigger SQL generation", () => {
    it("1. Gera trigger BEFORE INSERT sem WHEN/constraint", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(
        "CREATE TRIGGER trg_test\n" +
        "    BEFORE INSERT\n" +
        "    ON public.tb_users\n" +
        "    FOR EACH ROW\n" +
        "    EXECUTE FUNCTION public.fn_test();"
      );
    });

    it("2. Gera trigger AFTER UPDATE OR DELETE com WHERE (WHEN condition)", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "AFTER",
                    events: ["UPDATE", "DELETE"],
                    functionId: "fn-1",
                    forEach: "ROW",
                    condition: "NEW.age > 18",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(
        "CREATE TRIGGER trg_test\n" +
        "    AFTER UPDATE OR DELETE\n" +
        "    ON public.tb_users\n" +
        "    FOR EACH ROW\n" +
        "    WHEN (NEW.age > 18)\n" +
        "    EXECUTE FUNCTION public.fn_test();"
      );
    });

    it("3. Gera CONSTRAINT TRIGGER com DEFERRABLE INITIALLY DEFERRED", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "AFTER",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                    isConstraint: true,
                    deferrable: true,
                    initiallyDeferred: true,
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(
        "CREATE CONSTRAINT TRIGGER trg_test\n" +
        "    AFTER INSERT\n" +
        "    ON public.tb_users\n" +
        "    DEFERRABLE INITIALLY DEFERRED\n" +
        "    FOR EACH ROW\n" +
        "    EXECUTE FUNCTION public.fn_test();"
      );
    });

    it("3b. Forces AFTER timing for CONSTRAINT TRIGGER even if BEFORE/INSTEAD OF is set in model", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                    isConstraint: true,
                    deferrable: true,
                    initiallyDeferred: true,
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain(
        "CREATE CONSTRAINT TRIGGER trg_test\n" +
        "    AFTER INSERT\n" +
        "    ON public.tb_users\n" +
        "    DEFERRABLE INITIALLY DEFERRED\n" +
        "    FOR EACH ROW\n" +
        "    EXECUTE FUNCTION public.fn_test();"
      );
    });

    it("4. Gera trigger referenciando função de outro schema", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
          createSchemaFixture({
            id: "schema-2",
            name: "auth",
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-2",
            name: "fn_auth_log",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("EXECUTE FUNCTION auth.fn_auth_log();");
    });

    it("5. Triggers são gerados após tabelas e funções", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
      });
      const sql = generatePostgresSql(project);
      const funcIndex = sql.indexOf("CREATE OR REPLACE FUNCTION");
      const tableIndex = sql.indexOf("CREATE TABLE");
      const triggerIndex = sql.indexOf("CREATE TRIGGER");
      expect(funcIndex).toBeGreaterThan(-1);
      expect(tableIndex).toBeGreaterThan(-1);
      expect(triggerIndex).toBeGreaterThan(-1);
      expect(funcIndex).toBeLessThan(tableIndex);
      expect(tableIndex).toBeLessThan(triggerIndex);
    });
  });

  describe("PostgreSQL Views generation", () => {
    it("1. Gera uma View padrao com CREATE OR REPLACE VIEW", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_users",
            definition: "SELECT id, name FROM public.tb_users WHERE active = true;",
            isMaterialized: false,
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CREATE OR REPLACE VIEW public.v_users AS\nSELECT id, name FROM public.tb_users WHERE active = true;");
    });

    it("2. Gera uma Materialized View com CREATE MATERIALIZED VIEW", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_mat_users",
            definition: "SELECT id, name FROM public.tb_users",
            isMaterialized: true,
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CREATE MATERIALIZED VIEW public.v_mat_users AS\nSELECT id, name FROM public.tb_users;");
    });

    it("3. Gera uma Materialized View contendo o sufixo WITH NO DATA", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
          }),
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_mat_users_nodata",
            definition: "SELECT id, name FROM public.tb_users;",
            isMaterialized: true,
            withNoData: true,
          },
        ],
      });
      const sql = generatePostgresSql(project);
      expect(sql).toContain("CREATE MATERIALIZED VIEW public.v_mat_users_nodata AS\nSELECT id, name FROM public.tb_users WITH NO DATA;");
    });

    it("4. Valida a ordem no script combinado: views apos tabelas e antes de triggers", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "schema-1",
            name: "public",
            tables: [
              createTableFixture({
                id: "table-1",
                name: "tb_users",
                columns: [createColumnFixture({ name: "id", type: "integer" })],
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_test",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            schemaId: "schema-1",
            name: "fn_test",
            language: "plpgsql",
            returnType: "trigger",
            arguments: [],
            body: "BEGIN RETURN NEW; END;",
          },
        ],
        views: [
          {
            id: "view-1",
            schemaId: "schema-1",
            name: "v_users",
            definition: "SELECT * FROM public.tb_users",
            isMaterialized: false,
          },
        ],
      });

      const sql = generatePostgresSql(project);
      const tablePos = sql.indexOf("CREATE TABLE");
      const viewPos = sql.indexOf("CREATE OR REPLACE VIEW");
      const triggerPos = sql.indexOf("CREATE TRIGGER");

      expect(tablePos).toBeGreaterThan(-1);
      expect(viewPos).toBeGreaterThan(-1);
      expect(triggerPos).toBeGreaterThan(-1);

      expect(tablePos).toBeLessThan(viewPos);
      expect(viewPos).toBeLessThan(triggerPos);
    });
  });

  describe("Conditional Unique Constraints (Partial Unique Indexes)", () => {
    it("generates CREATE UNIQUE INDEX with WHERE clause for unique constraints with conditions", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "public",
            tables: [
              createTableFixture({
                name: "tb_users",
                columns: [
                  createColumnFixture({ name: "id", type: "integer" }),
                  createColumnFixture({ name: "email", type: "varchar" }),
                ],
                uniqueConstraints: [
                  {
                    id: "uc-1",
                    name: "uk_users_email_active",
                    columns: ["email"],
                    condition: "deleted_at IS NULL",
                  },
                ],
              }),
            ],
          }),
        ],
      });

      const sql = generatePostgresSql(project);
      
      // Should not be inline
      const createTablePart = sql.substring(sql.indexOf("CREATE TABLE"), sql.indexOf(");"));
      expect(createTablePart).not.toContain("uk_users_email_active");
      
      // Should be generated as a partial unique index
      expect(sql).toContain("CREATE UNIQUE INDEX uk_users_email_active ON public.tb_users (email) WHERE deleted_at IS NULL;");
    });
  });

  describe("Database Comments", () => {
    it("generates comments for schemas, tables, columns, PK, FK, UK, indexes, functions, triggers, views, sequences", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            name: "app",
            comment: "Application Schema",
            sequences: [
              {
                id: "seq-1",
                name: "user_seq",
                startWith: 1,
                incrementBy: 1,
                comment: "User sequence",
              },
            ],
            tables: [
              createTableFixture({
                name: "users",
                comment: "Users Table",
                primaryKeyComment: "PK comment",
                columns: [
                  createColumnFixture({
                    name: "id",
                    type: "integer",
                    primaryKey: true,
                    comment: "User ID",
                  }),
                  createColumnFixture({
                    name: "email",
                    type: "varchar",
                    comment: "User Email",
                  }),
                ],
                uniqueConstraints: [
                  {
                    id: "uc-1",
                    name: "uk_users_email",
                    columns: ["email"],
                    comment: "UK email comment",
                  },
                ],
                indexes: [
                  {
                    id: "idx-1",
                    name: "idx_users_email",
                    columns: ["email"],
                    comment: "Index comment",
                  },
                ],
                foreignKeys: [
                  {
                    id: "fk-1",
                    name: "fk_users_tenant",
                    sourceColumns: ["id"],
                    targetSchema: "app",
                    targetTable: "tenants",
                    targetColumns: ["id"],
                    comment: "FK comment",
                  },
                ],
                triggers: [
                  {
                    id: "trg-1",
                    name: "trg_users_audit",
                    eventTiming: "BEFORE",
                    events: ["INSERT"],
                    functionId: "fn-1",
                    forEach: "ROW",
                    comment: "Trigger comment",
                  },
                ],
              }),
            ],
          }),
        ],
        functions: [
          {
            id: "fn-1",
            name: "audit_log",
            schemaId: "s1",
            language: "plpgsql",
            returnType: "trigger",
            body: "BEGIN RETURN NEW; END;",
            comment: "Audit function",
            arguments: [],
          },
        ],
        views: [
          {
            id: "v-1",
            name: "active_users",
            schemaId: "s1",
            definition: "SELECT * FROM users",
            isMaterialized: false,
            comment: "Active users view",
          },
        ],
      });

      project.functions![0].schemaId = project.schemas[0].id;
      project.views![0].schemaId = project.schemas[0].id;

      const sql = generatePostgresSql(project);

      expect(sql).toContain("COMMENT ON SCHEMA app IS 'Application Schema';");
      expect(sql).toContain("COMMENT ON SEQUENCE app.user_seq IS 'User sequence';");
      expect(sql).toContain("COMMENT ON TABLE app.users IS 'Users Table';");
      expect(sql).toContain("COMMENT ON COLUMN app.users.id IS 'User ID';");
      expect(sql).toContain("COMMENT ON COLUMN app.users.email IS 'User Email';");
      expect(sql).toContain("COMMENT ON CONSTRAINT pk_users ON app.users IS 'PK comment';");
      expect(sql).toContain("COMMENT ON CONSTRAINT uk_users_email ON app.users IS 'UK email comment';");
      expect(sql).toContain("COMMENT ON INDEX app.idx_users_email IS 'Index comment';");
      expect(sql).toContain("COMMENT ON CONSTRAINT fk_users_tenant ON app.users IS 'FK comment';");
      expect(sql).toContain("COMMENT ON TRIGGER trg_users_audit ON app.users IS 'Trigger comment';");
      expect(sql).toContain("COMMENT ON FUNCTION app.audit_log() IS 'Audit function';");
      expect(sql).toContain("COMMENT ON VIEW app.active_users IS 'Active users view';");
    });

    it("25. Gera DDL para trigger em views", () => {
      const project = createProjectFixture({
        schemas: [
          createSchemaFixture({
            id: "s1",
            name: "app",
          }),
        ],
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
            name: "active_users",
            schemaId: "s1",
            definition: "SELECT * FROM users",
            isMaterialized: false,
            triggers: [
              {
                id: "trg-1",
                name: "trg_view_audit",
                eventTiming: "INSTEAD OF",
                events: ["INSERT"],
                functionId: "fn-1",
                forEach: "ROW",
                comment: "View trigger comment",
              },
            ],
          },
        ],
      });

      project.functions![0].schemaId = project.schemas[0].id;
      project.views![0].schemaId = project.schemas[0].id;

      const sql = generatePostgresSql(project);

      expect(sql).toContain("CREATE TRIGGER trg_view_audit");
      expect(sql).toContain("INSTEAD OF INSERT");
      expect(sql).toContain("ON app.active_users");
      expect(sql).toContain("FOR EACH ROW");
      expect(sql).toContain("EXECUTE FUNCTION app.audit_log();");
      expect(sql).toContain("COMMENT ON TRIGGER trg_view_audit ON app.active_users IS 'View trigger comment';");
    });
  });
});
