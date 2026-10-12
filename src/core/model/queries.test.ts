import { describe, expect, it } from "vitest";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
} from "../test-utils/project-fixtures";
import { findTableContext, findViewContext } from "./queries";
import type { DatabaseView } from "./types";

describe("model queries", () => {
  it("finds table context when table exists in project", () => {
    const table = createTableFixture({ id: "t-1", name: "users" });
    const schema = createSchemaFixture({ id: "s-1", name: "public", tables: [table] });
    const project = createProjectFixture({ schemas: [schema] });

    const context = findTableContext(project, "t-1");
    expect(context).toBeDefined();
    expect(context?.schema.id).toBe("s-1");
    expect(context?.table.id).toBe("t-1");
  });

  it("returns undefined when table is not found", () => {
    const project = createProjectFixture();
    expect(findTableContext(project, "missing")).toBeUndefined();
  });

  it("finds view context when view and its schema exist", () => {
    const schema = createSchemaFixture({ id: "s-1", name: "public" });
    const view: DatabaseView = {
      id: "v-1",
      name: "active_users",
      schemaId: "s-1",
      definition: "SELECT * FROM users WHERE active = true",
      isMaterialized: false,
    };
    const project = createProjectFixture({
      schemas: [schema],
      views: [view],
    });

    const context = findViewContext(project, "v-1");
    expect(context).toBeDefined();
    expect(context?.schema.id).toBe("s-1");
    expect(context?.view.id).toBe("v-1");
  });

  it("returns undefined when view is missing or its schema is missing", () => {
    const view: DatabaseView = {
      id: "v-1",
      name: "orphan_view",
      schemaId: "s-missing",
      definition: "SELECT 1",
      isMaterialized: false,
    };
    const project = createProjectFixture({
      schemas: [],
      views: [view],
    });

    expect(findViewContext(project, "v-non-existent")).toBeUndefined();
    expect(findViewContext(project, "v-1")).toBeUndefined();
  });
});
