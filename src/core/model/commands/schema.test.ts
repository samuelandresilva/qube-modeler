import { describe, expect, it } from "vitest";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
} from "../../test-utils/project-fixtures";
import {
  createSchema,
  updateSchema,
  removeSchema,
} from "./schema";
import type { DatabaseForeignKey } from "../types";

describe("schema commands", () => {
  it("creates a schema and appends it to project", () => {
    const project = createProjectFixture();
    const result = createSchema(project, "billing", "Billing schema");

    expect(result.id).toBeDefined();
    expect(result.project.schemas).toHaveLength(1);
    expect(result.project.schemas[0]).toEqual({
      id: result.id,
      name: "billing",
      sequences: [],
      tables: [],
      comment: "Billing schema",
    });
  });

  it("updates schema and cascades rename to foreign keys in other schemas", () => {
    const publicSchema = createSchemaFixture({
      id: "s-1",
      name: "auth",
      tables: [createTableFixture({ id: "t-1", name: "users" })],
    });
    const fk: DatabaseForeignKey = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "auth",
      targetTable: "users",
      targetColumns: ["id"],
    };
    const shopSchema = createSchemaFixture({
      id: "s-2",
      name: "shop",
      tables: [createTableFixture({ id: "t-2", name: "orders", foreignKeys: [fk] })],
    });
    const project = createProjectFixture({ schemas: [publicSchema, shopSchema] });

    const updatedProject = updateSchema(project, "s-1", (schema) => ({
      ...schema,
      name: "identity",
    }));

    const updatedAuth = updatedProject.schemas.find((s) => s.id === "s-1");
    const updatedShop = updatedProject.schemas.find((s) => s.id === "s-2");

    expect(updatedAuth?.name).toBe("identity");
    expect(updatedShop?.tables[0].foreignKeys[0].targetSchema).toBe("identity");
  });

  it("returns unchanged project if updateSchema does not rename schema", () => {
    const schema = createSchemaFixture({ id: "s-1", name: "public" });
    const project = createProjectFixture({ schemas: [schema] });

    const updated = updateSchema(project, "s-1", (s) => ({
      ...s,
      comment: "new comment",
    }));

    expect(updated.schemas[0].comment).toBe("new comment");
  });

  it("returns unchanged project if updateSchema schemaId is not found", () => {
    const project = createProjectFixture();
    expect(updateSchema(project, "missing", (s) => s)).toBe(project);
  });

  it("removes schema, cascading cleanup of foreign keys pointing to it and removing diagram nodes", () => {
    const authTable = createTableFixture({ id: "t-1", name: "users" });
    const authSchema = createSchemaFixture({
      id: "s-1",
      name: "auth",
      tables: [authTable],
    });
    const fk: DatabaseForeignKey = {
      id: "fk-1",
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "auth",
      targetTable: "users",
      targetColumns: ["id"],
    };
    const shopTable = createTableFixture({
      id: "t-2",
      name: "orders",
      foreignKeys: [fk],
    });
    const shopSchema = createSchemaFixture({
      id: "s-2",
      name: "shop",
      tables: [shopTable],
    });

    const project = createProjectFixture({
      schemas: [authSchema, shopSchema],
      diagram: {
        tableNodes: [
          { tableId: "t-1", position: { x: 0, y: 0 } },
          { tableId: "t-2", position: { x: 50, y: 50 } },
        ],
      },
    });

    const result = removeSchema(project, "s-1");

    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0].id).toBe("s-2");
    expect(result.schemas[0].tables[0].foreignKeys).toHaveLength(0);
    expect(result.diagram.tableNodes).toHaveLength(1);
    expect(result.diagram.tableNodes[0].tableId).toBe("t-2");
  });

  it("returns unchanged project if removeSchema schemaId is not found", () => {
    const project = createProjectFixture();
    expect(removeSchema(project, "missing")).toBe(project);
  });
});
