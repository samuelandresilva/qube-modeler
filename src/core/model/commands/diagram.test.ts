import { describe, expect, it } from "vitest";
import { createProjectFixture } from "../../test-utils/project-fixtures";
import { updateTableNodePosition } from "./diagram";

describe("diagram commands", () => {
  it("updates existing table node position", () => {
    const project = createProjectFixture({
      diagram: {
        tableNodes: [{ tableId: "t-1", position: { x: 10, y: 20 } }],
      },
    });

    const result = updateTableNodePosition(project, "t-1", { x: 150, y: 250 });

    expect(result.diagram.tableNodes).toHaveLength(1);
    expect(result.diagram.tableNodes[0]).toEqual({
      tableId: "t-1",
      position: { x: 150, y: 250 },
    });
  });

  it("adds new table node position if node does not exist", () => {
    const project = createProjectFixture({
      diagram: { tableNodes: [] },
    });

    const result = updateTableNodePosition(project, "t-1", { x: 50, y: 60 });

    expect(result.diagram.tableNodes).toHaveLength(1);
    expect(result.diagram.tableNodes[0]).toEqual({
      tableId: "t-1",
      position: { x: 50, y: 60 },
    });
  });
});
