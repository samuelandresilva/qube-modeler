import type { DatabaseProject, DatabaseFunction } from "../types";

export function createDatabaseFunction(
  project: DatabaseProject,
  input: Omit<DatabaseFunction, "id">,
): { id: string; project: DatabaseProject } {
  const id = crypto.randomUUID();
  const newFunction: DatabaseFunction = {
    id,
    ...input,
  };
  return {
    id,
    project: {
      ...project,
      functions: [...(project.functions ?? []), newFunction],
    },
  };
}

export function updateDatabaseFunction(
  project: DatabaseProject,
  functionId: string,
  patch: Partial<Omit<DatabaseFunction, "id">>,
): DatabaseProject {
  const functions = project.functions ?? [];
  const updatedFunctions = functions.map((fn) => {
    if (fn.id === functionId) {
      return { ...fn, ...patch } as DatabaseFunction;
    }
    return fn;
  });
  return {
    ...project,
    functions: updatedFunctions,
  };
}

export function removeDatabaseFunction(
  project: DatabaseProject,
  functionId: string,
): DatabaseProject {
  const functions = project.functions ?? [];
  return {
    ...project,
    functions: functions.filter((fn) => fn.id !== functionId),
  };
}
