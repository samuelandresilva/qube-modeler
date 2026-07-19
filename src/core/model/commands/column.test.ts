import { describe, it, expect } from "vitest";
import { moveColumn } from "./column";
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
});
