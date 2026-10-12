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
  createForeignKey,
  updateForeignKey,
  removeForeignKey,
  createUniqueConstraint,
  updateUniqueConstraint,
  removeUniqueConstraint,
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
        expression: "age >= 18",
      }),
    );

    const updatedTable = updatedProject.schemas[0].tables[0];
    expect(updatedTable.checkConstraints).toHaveLength(1);
    expect(updatedTable.checkConstraints[0].expression).toBe("age >= 18");
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

describe("Trigger model commands", () => {
  const table = createTableFixture({
    id: "t1",
    name: "tb_audit_log",
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
      name: "trg_update_timestamp",
      eventTiming: "BEFORE",
      events: ["UPDATE"],
      forEach: "ROW",
      functionId: "fn1",
    });

    expect(id).toBeDefined();
    const updatedTable = project.schemas[0].tables[0];
    expect(updatedTable.triggers).toHaveLength(1);
    expect(updatedTable.triggers[0]).toEqual({
      id,
      name: "trg_update_timestamp",
      eventTiming: "BEFORE",
      events: ["UPDATE"],
      forEach: "ROW",
      functionId: "fn1",
    });
  });

  it("updates an existing trigger", () => {
    const { id, project: projectWithTrg } = createTrigger(
      initialProject,
      "s1",
      "t1",
      {
        name: "trg_update_timestamp",
        eventTiming: "BEFORE",
        events: ["UPDATE"],
        forEach: "ROW",
        functionId: "fn1",
      },
    );

    const updatedProject = updateTrigger(
      projectWithTrg,
      "s1",
      "t1",
      id,
      (trg) => ({
        ...trg,
        eventTiming: "AFTER",
        events: ["INSERT", "UPDATE"],
      }),
    );

    const updatedTable = updatedProject.schemas[0].tables[0];
    expect(updatedTable.triggers).toHaveLength(1);
    expect(updatedTable.triggers[0].eventTiming).toBe("AFTER");
    expect(updatedTable.triggers[0].events).toEqual(["INSERT", "UPDATE"]);
  });

  it("removes a trigger from the table", () => {
    const { id, project: projectWithTrg } = createTrigger(
      initialProject,
      "s1",
      "t1",
      {
        name: "trg_update_timestamp",
        eventTiming: "BEFORE",
        events: ["UPDATE"],
        forEach: "ROW",
        functionId: "fn1",
      },
    );

    const cleanedProject = removeTrigger(projectWithTrg, "s1", "t1", id);
    const updatedTable = cleanedProject.schemas[0].tables[0];
    expect(updatedTable.triggers).toHaveLength(0);
  });
});

describe("Index model commands", () => {
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

  it("adds a new index with method to the table", () => {
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

  it("updates an existing index", () => {
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

describe("Foreign Key and Unique Constraint model commands", () => {
  const table = createTableFixture({
    id: "t1",
    name: "orders",
    foreignKeys: [],
    uniqueConstraints: [],
  });
  const schema = createSchemaFixture({
    id: "s1",
    name: "public",
    tables: [table],
  });
  const initialProject = createProjectFixture({
    schemas: [schema],
  });

  it("creates, updates, and removes a foreign key", () => {
    const { id, project: p1 } = createForeignKey(initialProject, "s1", "t1", {
      name: "fk_orders_user",
      sourceColumns: ["user_id"],
      targetSchema: "public",
      targetTable: "users",
      targetColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "NO ACTION",
    });

    expect(id).toBeDefined();
    expect(p1.schemas[0].tables[0].foreignKeys).toHaveLength(1);

    const p2 = updateForeignKey(p1, "s1", "t1", id, (fk) => ({
      ...fk,
      onDelete: "SET NULL",
    }));
    expect(p2.schemas[0].tables[0].foreignKeys[0].onDelete).toBe("SET NULL");

    const p3 = removeForeignKey(p2, "s1", "t1", id);
    expect(p3.schemas[0].tables[0].foreignKeys).toHaveLength(0);
  });

  it("creates, updates, and removes a unique constraint", () => {
    const { id, project: p1 } = createUniqueConstraint(initialProject, "s1", "t1", {
      name: "uk_orders_code",
      columns: ["order_code"],
    });

    expect(id).toBeDefined();
    expect(p1.schemas[0].tables[0].uniqueConstraints).toHaveLength(1);

    const p2 = updateUniqueConstraint(p1, "s1", "t1", id, (uk) => ({
      ...uk,
      columns: ["order_code", "tenant_id"],
    }));
    expect(p2.schemas[0].tables[0].uniqueConstraints[0].columns).toEqual(["order_code", "tenant_id"]);

    const p3 = removeUniqueConstraint(p2, "s1", "t1", id);
    expect(p3.schemas[0].tables[0].uniqueConstraints).toHaveLength(0);
  });
});
