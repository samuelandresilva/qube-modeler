import { describe, expect, it } from "vitest";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
} from "../../test-utils/project-fixtures";
import {
  createTable,
  updateTable,
  removeTable,
  moveTableSchema,
} from "./table";
import type { DatabaseForeignKey } from "../types";

describe("table commands", () => {
  it("creates a table in the target schema and adds a diagram node", () => {
    const schema = createSchemaFixture({ id: "s-1", name: "public" });
    const project = createProjectFixture({ schemas: [schema] });

    const result = createTable(project, "s-1", { x: 200, y: 300 });

    expect(result.id).toBeDefined();
    const updatedSchema = result.project.schemas[0];
    expect(updatedSchema.tables).toHaveLength(1);
    expect(updatedSchema.tables[0].id).toBe(result.id);
    expect(updatedSchema.tables[0].name).toBe("table_1");
    expect(result.project.diagram.tableNodes).toHaveLength(1);
    expect(result.project.diagram.tableNodes[0]).toEqual({
      tableId: result.id,
      position: { x: 200, y: 300 },
    });
  });

  it("creates table with default position if position is omitted", () => {
    const schema = createSchemaFixture({ id: "s-1" });
    const project = createProjectFixture({ schemas: [schema] });

    const result = createTable(project, "s-1");

    expect(result.project.diagram.tableNodes[0].position).toEqual({
      x: 120,
      y: 120,
    });
  });

  it("returns unchanged project if schemaId is not found", () => {
    const project = createProjectFixture();
    const result = createTable(project, "non-existent");
    expect(result.project).toBe(project);
  });

  it("updates table properties and cascades table rename to referencing foreign keys", () => {
    const usersTable = createTableFixture({ id: "t-1", name: "users" });
    const fk: DatabaseForeignKey = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    };
    const ordersTable = createTableFixture({
      id: "t-2",
      name: "orders",
      foreignKeys: [fk],
    });
    const schema = createSchemaFixture({
      id: "s-1",
      name: "public",
      tables: [usersTable, ordersTable],
    });
    const project = createProjectFixture({ schemas: [schema] });

    const updatedProject = updateTable(project, "s-1", "t-1", (table) => ({
      ...table,
      name: "app_users",
    }));

    const updatedSchema = updatedProject.schemas[0];
    const updatedUsers = updatedSchema.tables.find((t) => t.id === "t-1");
    const updatedOrders = updatedSchema.tables.find((t) => t.id === "t-2");

    expect(updatedUsers?.name).toBe("app_users");
    expect(updatedOrders?.foreignKeys[0].targetTable).toBe("app_users");
  });

  it("returns unchanged project if updateTable does not change the table name", () => {
    const usersTable = createTableFixture({ id: "t-1", name: "users" });
    const schema = createSchemaFixture({ id: "s-1", tables: [usersTable] });
    const project = createProjectFixture({ schemas: [schema] });

    const updatedProject = updateTable(project, "s-1", "t-1", (table) => ({
      ...table,
      comment: "A table comment",
    }));

    expect(updatedProject.schemas[0].tables[0].comment).toBe("A table comment");
  });

  it("returns unchanged project if tableId is not found in updateTable", () => {
    const schema = createSchemaFixture({ id: "s-1" });
    const project = createProjectFixture({ schemas: [schema] });

    const result = updateTable(project, "s-1", "missing", (t) => t);
    expect(result).toBe(project);
  });

  it("removes table, cleans up incoming foreign keys, and removes diagram node", () => {
    const usersTable = createTableFixture({ id: "t-1", name: "users" });
    const fk: DatabaseForeignKey = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
    };
    const ordersTable = createTableFixture({
      id: "t-2",
      name: "orders",
      foreignKeys: [fk],
    });
    const schema = createSchemaFixture({
      id: "s-1",
      name: "public",
      tables: [usersTable, ordersTable],
    });
    const project = createProjectFixture({
      schemas: [schema],
      diagram: {
        tableNodes: [
          { tableId: "t-1", position: { x: 0, y: 0 } },
          { tableId: "t-2", position: { x: 100, y: 100 } },
        ],
      },
    });

    const result = removeTable(project, "s-1", "t-1");

    expect(result.schemas[0].tables.find((t) => t.id === "t-1")).toBeUndefined();
    expect(result.schemas[0].tables.find((t) => t.id === "t-2")?.foreignKeys).toHaveLength(0);
    expect(result.diagram.tableNodes).toHaveLength(1);
    expect(result.diagram.tableNodes[0].tableId).toBe("t-2");
  });

  it("returns unchanged project if removeTable targets missing table", () => {
    const project = createProjectFixture();
    const result = removeTable(project, "s-1", "missing");
    expect(result).toBe(project);
  });

  it("moves table to another schema and updates foreign key references", () => {
    const tableToMove = createTableFixture({
      id: "t-1",
      name: "logs",
      foreignKeys: [
        {
          id: "fk-internal",
          name: "fk_self",
          sourceColumns: ["parent_id"],
          targetSchema: "public",
          targetTable: "logs",
          targetColumns: ["id"],
        },
      ],
    });
    const externalTable = createTableFixture({
      id: "t-2",
      name: "events",
      foreignKeys: [
        {
          id: "fk-ext",
          name: "fk_events_log",
          sourceColumns: ["log_id"],
          targetSchema: "public",
          targetTable: "logs",
          targetColumns: ["id"],
        },
      ],
    });
    const publicSchema = createSchemaFixture({
      id: "s-1",
      name: "public",
      tables: [tableToMove, externalTable],
    });
    const auditSchema = createSchemaFixture({
      id: "s-2",
      name: "audit",
      tables: [],
    });
    const project = createProjectFixture({ schemas: [publicSchema, auditSchema] });

    const result = moveTableSchema(project, "t-1", "s-2");

    const newPublic = result.schemas.find((s) => s.id === "s-1");
    const newAudit = result.schemas.find((s) => s.id === "s-2");

    expect(newPublic?.tables.find((t) => t.id === "t-1")).toBeUndefined();
    expect(newAudit?.tables.find((t) => t.id === "t-1")).toBeDefined();

    // The moved table's internal FK referencing itself in old schema now points to new schema
    const movedTable = newAudit?.tables.find((t) => t.id === "t-1");
    expect(movedTable?.foreignKeys[0].targetSchema).toBe("audit");

    // The external table's FK pointing to the moved table now points to new schema
    const updatedExternal = newPublic?.tables.find((t) => t.id === "t-2");
    expect(updatedExternal?.foreignKeys[0].targetSchema).toBe("audit");
  });

  it("returns unchanged project if moveTableSchema targets current schema or missing table", () => {
    const table = createTableFixture({ id: "t-1" });
    const schema = createSchemaFixture({ id: "s-1", tables: [table] });
    const project = createProjectFixture({ schemas: [schema] });

    expect(moveTableSchema(project, "t-1", "s-1")).toBe(project);
    expect(moveTableSchema(project, "missing", "s-1")).toBe(project);
  });
});
