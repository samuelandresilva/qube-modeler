import { describe, it, expect } from "vitest";
import { createColumn, moveColumn, removeColumn, updateColumn } from "./column";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
  createColumnFixture,
} from "../../test-utils/project-fixtures";

describe("column model commands", () => {
  it("reorders columns up and down in table", () => {
    const col1 = createColumnFixture({ id: "c1", name: "col_1" });
    const col2 = createColumnFixture({ id: "c2", name: "col_2" });
    const col3 = createColumnFixture({ id: "c3", name: "col_3" });

    const table = createTableFixture({
      id: "t1",
      name: "tb_users",
      columns: [col1, col2, col3],
    });
    const schema = createSchemaFixture({
      id: "s1",
      name: "public",
      tables: [table],
    });
    const project = createProjectFixture({
      schemas: [schema],
    });

    // Move c2 up
    const projectAfterMoveUp = moveColumn(project, "s1", "t1", "c2", "up");
    const tableAfterMoveUp = projectAfterMoveUp.schemas[0].tables[0];
    expect(tableAfterMoveUp.columns.map((c) => c.id)).toEqual(["c2", "c1", "c3"]);

    // Move c2 down (from the new state)
    const projectAfterMoveDown = moveColumn(projectAfterMoveUp, "s1", "t1", "c2", "down");
    const tableAfterMoveDown = projectAfterMoveDown.schemas[0].tables[0];
    expect(tableAfterMoveDown.columns.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);

    // Move c1 up (already at top, should do nothing)
    const projectNoOp = moveColumn(project, "s1", "t1", "c1", "up");
    expect(projectNoOp).toEqual(project);
  });

  it("creates and updates column with isArray property", () => {
    const table = createTableFixture({
      id: "t1",
      name: "tb_items",
      columns: [],
    });
    const schema = createSchemaFixture({
      id: "s1",
      name: "public",
      tables: [table],
    });
    const project = createProjectFixture({
      schemas: [schema],
    });

    const createRes = createColumn(project, "s1", "t1", {
      name: "tags",
      type: "varchar",
      size: 50,
      isArray: true,
      nullable: true,
      primaryKey: false,
    });

    const createdCol = createRes.project.schemas[0].tables[0].columns[0];
    expect(createdCol.name).toBe("tags");
    expect(createdCol.isArray).toBe(true);
    expect(createdCol.type).toBe("varchar");

    const updatedProject = updateColumn(
      createRes.project,
      "s1",
      "t1",
      createRes.id,
      (col) => ({ ...col, isArray: false }),
    );

    const updatedCol = updatedProject.schemas[0].tables[0].columns[0];
    expect(updatedCol.isArray).toBe(false);
  });

  it("does not remove indexes or unique constraints from other tables when removing a column with the same name", () => {
    const colUsersId = createColumnFixture({ id: "col-u-id", name: "id" });
    const usersTable = createTableFixture({
      id: "t-users",
      name: "users",
      columns: [colUsersId],
      indexes: [
        { id: "idx-users-id", name: "idx_users_id", columns: ["id"] },
      ],
      uniqueConstraints: [
        { id: "uk-users-id", name: "uk_users_id", columns: ["id"] },
      ],
    });

    const colOrdersId = createColumnFixture({ id: "col-o-id", name: "id" });
    const ordersTable = createTableFixture({
      id: "t-orders",
      name: "orders",
      columns: [colOrdersId],
      indexes: [],
      uniqueConstraints: [],
    });

    const schema = createSchemaFixture({
      id: "s1",
      name: "public",
      tables: [usersTable, ordersTable],
    });

    const project = createProjectFixture({
      schemas: [schema],
    });

    // Remove 'id' column from 'orders' table
    const nextProject = removeColumn(project, "s1", "t-orders", "col-o-id");

    const reloadedUsers = nextProject.schemas[0].tables.find((t) => t.id === "t-users");
    const reloadedOrders = nextProject.schemas[0].tables.find((t) => t.id === "t-orders");

    // Orders should have no columns left
    expect(reloadedOrders?.columns).toHaveLength(0);

    // Users must NOT lose its indexes or unique constraints!
    expect(reloadedUsers?.indexes).toHaveLength(1);
    expect(reloadedUsers?.indexes[0].name).toBe("idx_users_id");
    expect(reloadedUsers?.uniqueConstraints).toHaveLength(1);
    expect(reloadedUsers?.uniqueConstraints[0].name).toBe("uk_users_id");
  });

  it("cleans up columnIds in checkConstraints when a column is removed from the table", () => {
    const colAge = createColumnFixture({ id: "col-age", name: "age" });
    const colOther = createColumnFixture({ id: "col-other", name: "other" });
    const table = createTableFixture({
      id: "t1",
      name: "users",
      columns: [colAge, colOther],
      checkConstraints: [
        {
          id: "chk-1",
          name: "chk_age",
          expression: "age > 0",
          columnIds: ["col-age", "col-other"],
        },
      ],
    });

    const schema = createSchemaFixture({
      id: "s1",
      name: "public",
      tables: [table],
    });

    const project = createProjectFixture({
      schemas: [schema],
    });

    const nextProject = removeColumn(project, "s1", "t1", "col-age");
    const updatedTable = nextProject.schemas[0].tables[0];

    expect(updatedTable.columns).toHaveLength(1);
    expect(updatedTable.checkConstraints).toHaveLength(1);
    expect(updatedTable.checkConstraints[0].columnIds).toEqual(["col-other"]);
  });
});
