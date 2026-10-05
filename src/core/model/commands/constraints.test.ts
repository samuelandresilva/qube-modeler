import { describe, it, expect } from "vitest";
import {
  createCheckConstraint,
  updateCheckConstraint,
  removeCheckConstraint,
  createTrigger,
  updateTrigger,
  removeTrigger,
  createIndex,
  updateIndex,
  removeIndex,
} from "./constraints";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
} from "../../test-utils/project-fixtures";

describe("CHECK constraints model commands", () => {
  const table = createTableFixture({
    id: "t1",
    name: "tb_users",
    checkConstraints: [],
  });
  const schema = createSchemaFixture({
    id: "s1",
    name: "public",
    tables: [table],
  });
  const initialProject = createProjectFixture({
    schemas: [schema],
  });

  it("adds a new CHECK constraint to the table", () => {
    const { id, project } = createCheckConstraint(initialProject, "s1", "t1", {
      name: "chk_tb_users_age",
      expression: "age BETWEEN 0 AND 120",
      columnIds: ["col1"],
    });

    expect(id).toBeDefined();
    const updatedTable = project.schemas[0].tables[0];
    expect(updatedTable.checkConstraints).toHaveLength(1);
    expect(updatedTable.checkConstraints[0]).toEqual({
      id,
      name: "chk_tb_users_age",
      expression: "age BETWEEN 0 AND 120",
      columnIds: ["col1"],
    });
  });

  it("updates an existing CHECK constraint", () => {
    const { id, project: projectWithCheck } = createCheckConstraint(
      initialProject,
      "s1",
      "t1",
      {
        name: "chk_tb_users_age",
        expression: "age BETWEEN 0 AND 120",
        columnIds: ["col1"],
      },
    );

    const updatedProject = updateCheckConstraint(
      projectWithCheck,
      "s1",
      "t1",
      id,
      (chk) => ({
        ...chk,
        expression: "age BETWEEN 18 AND 120",
      }),
    );

    const updatedTable = updatedProject.schemas[0].tables[0];
    expect(updatedTable.checkConstraints).toHaveLength(1);
    expect(updatedTable.checkConstraints[0].expression).toBe("age BETWEEN 18 AND 120");
  });

  it("removes a CHECK constraint from the table", () => {
    const { id, project: projectWithCheck } = createCheckConstraint(
      initialProject,
      "s1",
      "t1",
      {
        name: "chk_tb_users_age",
        expression: "age BETWEEN 0 AND 120",
        columnIds: ["col1"],
      },
    );

    const cleanedProject = removeCheckConstraint(projectWithCheck, "s1", "t1", id);
    const updatedTable = cleanedProject.schemas[0].tables[0];
    expect(updatedTable.checkConstraints).toHaveLength(0);
  });
});

describe("PostgreSQL trigger model commands", () => {
  const table = createTableFixture({
    id: "t1",
    name: "tb_users",
    triggers: [],
  });
  const schema = createSchemaFixture({
    id: "s1",
    name: "public",
    tables: [table],
  });
  const initialProject = createProjectFixture({
    schemas: [schema],
  });

  it("adds a new trigger to the table", () => {
    const { id, project } = createTrigger(initialProject, "s1", "t1", {
      name: "trg_log",
      eventTiming: "BEFORE",
      events: ["INSERT"],
      functionId: "fn-1",
      forEach: "ROW",
    });

    expect(id).toBeDefined();
    const updatedTable = project.schemas[0].tables[0];
    expect(updatedTable.triggers).toHaveLength(1);
    expect(updatedTable.triggers[0]).toEqual({
      id,
      name: "trg_log",
      eventTiming: "BEFORE",
      events: ["INSERT"],
      functionId: "fn-1",
      forEach: "ROW",
    });
  });

  it("updates an existing trigger", () => {
    const { id, project: projectWithTrigger } = createTrigger(
      initialProject,
      "s1",
      "t1",
      {
        name: "trg_log",
        eventTiming: "BEFORE",
        events: ["INSERT"],
        functionId: "fn-1",
        forEach: "ROW",
      },
    );

    const updatedProject = updateTrigger(
      projectWithTrigger,
      "s1",
      "t1",
      id,
      (trg) => ({
        ...trg,
        eventTiming: "AFTER",
      }),
    );

    const updatedTable = updatedProject.schemas[0].tables[0];
    expect(updatedTable.triggers).toHaveLength(1);
    expect(updatedTable.triggers[0].eventTiming).toBe("AFTER");
  });

  it("removes a trigger from the table", () => {
    const { id, project: projectWithTrigger } = createTrigger(
      initialProject,
      "s1",
      "t1",
      {
        name: "trg_log",
        eventTiming: "BEFORE",
        events: ["INSERT"],
        functionId: "fn-1",
        forEach: "ROW",
      },
    );

    const cleanedProject = removeTrigger(projectWithTrigger, "s1", "t1", id);
    const updatedTable = cleanedProject.schemas[0].tables[0];
    expect(updatedTable.triggers).toHaveLength(0);
  });
});

describe("Database index model commands", () => {
  const table = createTableFixture({
    id: "t1",
    name: "tb_songs",
    indexes: [],
  });
  const schema = createSchemaFixture({
    id: "s1",
    name: "public",
    tables: [table],
  });
  const initialProject = createProjectFixture({
    schemas: [schema],
  });

  it("adds a new index with method (e.g. GIN) to the table", () => {
    const { id, project } = createIndex(initialProject, "s1", "t1", {
      name: "idx_tb_songs_tags_gin",
      columns: ["tags"],
      method: "gin",
    });

    expect(id).toBeDefined();
    const updatedTable = project.schemas[0].tables[0];
    expect(updatedTable.indexes).toHaveLength(1);
    expect(updatedTable.indexes[0]).toEqual({
      id,
      name: "idx_tb_songs_tags_gin",
      columns: ["tags"],
      method: "gin",
    });
  });

  it("updates an existing index method and columns", () => {
    const { id, project: projectWithIdx } = createIndex(
      initialProject,
      "s1",
      "t1",
      {
        name: "idx_tb_songs_tags",
        columns: ["tags"],
        method: "btree",
      },
    );

    const updatedProject = updateIndex(
      projectWithIdx,
      "s1",
      "t1",
      id,
      (idx) => ({
        ...idx,
        method: "gin",
      }),
    );

    const updatedTable = updatedProject.schemas[0].tables[0];
    expect(updatedTable.indexes).toHaveLength(1);
    expect(updatedTable.indexes[0].method).toBe("gin");
  });

  it("removes an index from the table", () => {
    const { id, project: projectWithIdx } = createIndex(
      initialProject,
      "s1",
      "t1",
      {
        name: "idx_tb_songs_tags_gin",
        columns: ["tags"],
        method: "gin",
      },
    );

    const cleanedProject = removeIndex(projectWithIdx, "s1", "t1", id);
    const updatedTable = cleanedProject.schemas[0].tables[0];
    expect(updatedTable.indexes).toHaveLength(0);
  });
});

