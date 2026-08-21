import type { DatabaseProject, DatabaseView, CreateResult, DatabaseTrigger, DatabaseTriggerInput } from "../types";

export function createDatabaseView(
  project: DatabaseProject,
  schemaId: string,
  position?: { x: number; y: number },
): CreateResult {
  const id = crypto.randomUUID();
  const schemaViews = (project.views ?? []).filter((v) => v.schemaId === schemaId);
  const viewName = `view_${schemaViews.length + 1}`;

  const newView: DatabaseView = {
    id,
    schemaId,
    name: viewName,
    definition: "",
    isMaterialized: false,
    triggers: [],
    x: position?.x ?? 120,
    y: position?.y ?? 120,
  };
  return {
    id,
    project: {
      ...project,
      views: [...(project.views ?? []), newView],
    },
  };
}

export function updateDatabaseView(
  project: DatabaseProject,
  id: string,
  updater: (item: DatabaseView) => DatabaseView,
): DatabaseProject {
  return {
    ...project,
    views: (project.views ?? []).map((item) =>
      item.id === id ? updater(item) : item,
    ),
  };
}

export function removeDatabaseView(
  project: DatabaseProject,
  id: string,
): DatabaseProject {
  return {
    ...project,
    views: (project.views ?? []).filter((item) => item.id !== id),
  };
}

export function createViewTrigger(
  project: DatabaseProject,
  viewId: string,
  input: DatabaseTriggerInput,
): CreateResult {
  const id = crypto.randomUUID();
  return {
    id,
    project: {
      ...project,
      views: (project.views ?? []).map((view) =>
        view.id === viewId
          ? { ...view, triggers: [...(view.triggers ?? []), { id, ...input }] }
          : view
      ),
    },
  };
}

export function updateViewTrigger(
  project: DatabaseProject,
  viewId: string,
  id: string,
  updater: (item: DatabaseTrigger) => DatabaseTrigger,
): DatabaseProject {
  return {
    ...project,
    views: (project.views ?? []).map((view) =>
      view.id === viewId
        ? {
            ...view,
            triggers: (view.triggers ?? []).map((item) =>
              item.id === id ? updater(item) : item
            ),
          }
        : view
    ),
  };
}

export function removeViewTrigger(
  project: DatabaseProject,
  viewId: string,
  id: string,
): DatabaseProject {
  return {
    ...project,
    views: (project.views ?? []).map((view) =>
      view.id === viewId
        ? {
            ...view,
            triggers: (view.triggers ?? []).filter((item) => item.id !== id),
          }
        : view
    ),
  };
}
