import { describe, expect, it } from "vitest";
import {
  createProjectFixture,
  createSchemaFixture,
  createTableFixture,
} from "../../test-utils/project-fixtures";
import {
  createSubjectArea,
  updateSubjectArea,
  removeSubjectArea,
  createTextNote,
  updateTextNote,
  removeTextNote,
  setTableSubjectArea,
} from "./subject-area-and-note";

describe("subject-area-and-note commands", () => {
  it("creates, updates, and removes a subject area", () => {
    const table = createTableFixture({ id: "t-1", subjectAreaId: "sa-1" });
    const schema = createSchemaFixture({ id: "s-1", tables: [table] });
    let project = createProjectFixture({ schemas: [schema] });

    // Create
    project = createSubjectArea(project, {
      name: "Finance",
      color: "#ff0000",
      position: { x: 10, y: 10 },
      width: 200,
      height: 150,
    });
    expect(project.subjectAreas).toHaveLength(1);
    const areaId = project.subjectAreas![0].id;

    // Update
    project = updateSubjectArea(project, areaId, (area) => ({
      ...area,
      name: "Billing",
    }));
    expect(project.subjectAreas![0].name).toBe("Billing");

    // Remove
    project = removeSubjectArea(project, "sa-1");
    expect(project.schemas[0].tables[0].subjectAreaId).toBeUndefined();
  });

  it("creates, updates, and removes text notes", () => {
    let project = createProjectFixture();

    // Create
    project = createTextNote(project, {
      content: "Important info",
      position: { x: 50, y: 50 },
      width: 150,
      height: 100,
      color: "#ffff00",
    });
    expect(project.textNotes).toHaveLength(1);
    const noteId = project.textNotes![0].id;

    // Update
    project = updateTextNote(project, noteId, (note) => ({
      ...note,
      content: "Updated Note",
    }));
    expect(project.textNotes![0].content).toBe("Updated Note");

    // Remove
    project = removeTextNote(project, noteId);
    expect(project.textNotes).toHaveLength(0);
  });

  it("sets table subject area", () => {
    const table = createTableFixture({ id: "t-1" });
    const schema = createSchemaFixture({ id: "s-1", tables: [table] });
    let project = createProjectFixture({ schemas: [schema] });

    project = setTableSubjectArea(project, "s-1", "t-1", "area-123");
    expect(project.schemas[0].tables[0].subjectAreaId).toBe("area-123");

    project = setTableSubjectArea(project, "s-1", "t-1", undefined);
    expect(project.schemas[0].tables[0].subjectAreaId).toBeUndefined();
  });
});
