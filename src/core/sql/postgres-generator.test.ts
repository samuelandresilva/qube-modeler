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
});
