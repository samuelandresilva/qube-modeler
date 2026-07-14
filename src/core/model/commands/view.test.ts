import { describe, it, expect } from "vitest";
import { createProjectFixture } from "../../test-utils/project-fixtures";
import {
  createDatabaseView,
  updateDatabaseView,
  removeDatabaseView,
  createViewTrigger,
  updateViewTrigger,
  removeViewTrigger,
} from "./view";

describe("View model commands", () => {
  it("1. createDatabaseView adds a view to the project", () => {
    const project = createProjectFixture();
    const result = createDatabaseView(project, "schema-1", { x: 100, y: 150 });

    expect(result.id).toBeDefined();
    expect(result.project.views).toHaveLength(1);
    expect(result.project.views[0].name).toBe("view_1");
  });

  it("2. updateDatabaseView modifies an existing view", () => {
    const project = createProjectFixture({
      views: [
        {
          id: "v1",
          schemaId: "schema-1",
          name: "v_test",
          definition: "SELECT * FROM t",
          isMaterialized: false,
        },
      ],
    });

    const updated = updateDatabaseView(project, "v1", (view) => ({
      ...view,
      name: "v_test_updated",
      isMaterialized: true,
    }));

    expect(updated.views[0].name).toBe("v_test_updated");
    expect(updated.views[0].isMaterialized).toBe(true);
  });

  it("3. removeDatabaseView deletes a view", () => {
    const project = createProjectFixture({
      views: [
        {
          id: "v1",
          schemaId: "schema-1",
          name: "v_test",
          definition: "SELECT * FROM t",
          isMaterialized: false,
        },
      ],
    });

    const updated = removeDatabaseView(project, "v1");
    expect(updated.views).toHaveLength(0);
  });

  it("4. createViewTrigger, updateViewTrigger, and removeViewTrigger manage triggers on views", () => {
    const project = createProjectFixture({
      views: [
        {
          id: "v1",
          schemaId: "schema-1",
          name: "v_test",
          definition: "SELECT * FROM t",
          isMaterialized: false,
          triggers: [],
        },
      ],
    });

    const res = createViewTrigger(project, "v1", {
      name: "trg_v1",
      eventTiming: "INSTEAD OF",
      events: ["INSERT"],
      functionId: "fn-1",
      forEach: "ROW",
    });

    expect(res.id).toBeDefined();
    expect(res.project.views[0].triggers).toHaveLength(1);
    expect(res.project.views[0].triggers?.[0].name).toBe("trg_v1");

    const updated = updateViewTrigger(res.project, "v1", res.id, (trg) => ({
      ...trg,
      name: "trg_v1_updated",
    }));
    expect(updated.views[0].triggers?.[0].name).toBe("trg_v1_updated");

    const removed = removeViewTrigger(updated, "v1", res.id);
    expect(removed.views[0].triggers).toHaveLength(0);
  });
});
