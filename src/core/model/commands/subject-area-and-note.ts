import type { DatabaseProject, SubjectArea, TextNote } from "../types";
import { updateTableInProject } from "../internal/update-helpers";

export function createSubjectArea(
  project: DatabaseProject,
  area: Omit<SubjectArea, "id">,
): DatabaseProject {
  const newArea: SubjectArea = {
    id: crypto.randomUUID(),
    ...area,
  };
  return {
    ...project,
    subjectAreas: [...(project.subjectAreas ?? []), newArea],
  };
}

export function updateSubjectArea(
  project: DatabaseProject,
  areaId: string,
  updater: (area: SubjectArea) => SubjectArea,
): DatabaseProject {
  return {
    ...project,
    subjectAreas: (project.subjectAreas ?? []).map((area) =>
      area.id === areaId ? updater(area) : area,
    ),
  };
}

export function removeSubjectArea(
  project: DatabaseProject,
  areaId: string,
): DatabaseProject {
  const updatedProject = {
    ...project,
    subjectAreas: (project.subjectAreas ?? []).filter((area) => area.id !== areaId),
  };

  return {
    ...updatedProject,
    schemas: updatedProject.schemas.map((schema) => ({
      ...schema,
      tables: schema.tables.map((table) =>
        table.subjectAreaId === areaId
          ? { ...table, subjectAreaId: undefined }
          : table,
      ),
    })),
  };
}

export function createTextNote(
  project: DatabaseProject,
  note: Omit<TextNote, "id">,
): DatabaseProject {
  const newNote: TextNote = {
    id: crypto.randomUUID(),
    ...note,
  };
  return {
    ...project,
    textNotes: [...(project.textNotes ?? []), newNote],
  };
}

export function updateTextNote(
  project: DatabaseProject,
  noteId: string,
  updater: (note: TextNote) => TextNote,
): DatabaseProject {
  return {
    ...project,
    textNotes: (project.textNotes ?? []).map((note) =>
      note.id === noteId ? updater(note) : note,
    ),
  };
}

export function removeTextNote(
  project: DatabaseProject,
  noteId: string,
): DatabaseProject {
  return {
    ...project,
    textNotes: (project.textNotes ?? []).filter((note) => note.id !== noteId),
  };
}

export function setTableSubjectArea(
  project: DatabaseProject,
  schemaId: string,
  tableId: string,
  subjectAreaId?: string,
): DatabaseProject {
  return updateTableInProject(project, schemaId, tableId, (table) => ({
    ...table,
    subjectAreaId,
  }));
}
