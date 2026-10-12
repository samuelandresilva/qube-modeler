import { describe, expect, it } from "vitest";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
  createColumnFixture,
} from "../../test-utils/project-fixtures";
import {
  createSequence,
  updateSequence,
  removeSequence,
} from "./sequence";

describe("sequence commands", () => {
  it("creates a sequence in the target schema", () => {
    const schema = createSchemaFixture({ id: "s-1" });
    const project = createProjectFixture({ schemas: [schema] });

    const result = createSequence(project, "s-1", {
      name: "order_id_seq",
      startWith: 1,
      incrementBy: 1,
    });

    expect(result.id).toBeDefined();
    const updatedSchema = result.project.schemas[0];
    expect(updatedSchema.sequences).toHaveLength(1);
    expect(updatedSchema.sequences[0]).toEqual({
      id: result.id,
      name: "order_id_seq",
      startWith: 1,
      incrementBy: 1,
    });
  });

  it("updates a sequence and cascades rename to column sequenceName", () => {
    const col = createColumnFixture({ id: "c-1", name: "id", sequenceName: "user_seq" });
    const table = createTableFixture({ id: "t-1", columns: [col] });
    const schema = createSchemaFixture({
      id: "s-1",
      sequences: [
        {
          id: "seq-1",
          name: "user_seq",
          startWith: 1,
          incrementBy: 1,
        },
      ],
      tables: [table],
    });
    const project = createProjectFixture({ schemas: [schema] });

    const updatedProject = updateSequence(project, "s-1", "seq-1", (seq) => ({
      ...seq,
      name: "account_seq",
    }));

    const updatedSchema = updatedProject.schemas[0];
    expect(updatedSchema.sequences[0].name).toBe("account_seq");
    expect(updatedSchema.tables[0].columns[0].sequenceName).toBe("account_seq");
  });

  it("returns unchanged schema if sequenceId not found in updateSequence", () => {
    const schema = createSchemaFixture({ id: "s-1" });
    const project = createProjectFixture({ schemas: [schema] });

    const result = updateSequence(project, "s-1", "missing", (s) => s);
    expect(result.schemas[0].sequences).toHaveLength(0);
  });

  it("removes a sequence and unsets sequenceName on referencing columns", () => {
    const col = createColumnFixture({ id: "c-1", name: "id", sequenceName: "user_seq" });
    const table = createTableFixture({ id: "t-1", columns: [col] });
    const schema = createSchemaFixture({
      id: "s-1",
      sequences: [
        {
          id: "seq-1",
          name: "user_seq",
          startWith: 1,
          incrementBy: 1,
        },
      ],
      tables: [table],
    });
    const project = createProjectFixture({ schemas: [schema] });

    const updatedProject = removeSequence(project, "s-1", "seq-1");

    const updatedSchema = updatedProject.schemas[0];
    expect(updatedSchema.sequences).toHaveLength(0);
    expect(updatedSchema.tables[0].columns[0].sequenceName).toBeUndefined();
  });

  it("returns unchanged schema if removeSequence targets missing sequence", () => {
    const schema = createSchemaFixture({ id: "s-1" });
    const project = createProjectFixture({ schemas: [schema] });

    const result = removeSequence(project, "s-1", "missing");
    expect(result.schemas[0]).toEqual(schema);
  });
});
