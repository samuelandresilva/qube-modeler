import type { DatabaseProject } from "../model/types";
import { validateProject } from "../validation/project";

export const QBM_FORMAT = "qube-modeler-project" as const;
export const QBM_FORMAT_VERSION = 1 as const;

export type QbmFile = {
  format: typeof QBM_FORMAT;
  formatVersion: typeof QBM_FORMAT_VERSION;
  createdWith: {
    app: "Qube Modeler";
    version: string;
  };
  savedAt: string;
  project: DatabaseProject;
};

export function createQbmFile(
  project: DatabaseProject,
  appVersion = "0.0.0",
): QbmFile {
  return {
    format: QBM_FORMAT,
    formatVersion: QBM_FORMAT_VERSION,
    createdWith: {
      app: "Qube Modeler",
      version: appVersion,
    },
    savedAt: new Date().toISOString(),
    project: validateProject(project),
  };
}

export function parseQbmFile(raw: string): DatabaseProject {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The selected .qbm file is not valid JSON.");
  }

  if (!isObject(value)) throw new Error("The .qbm file must contain an object.");
  if (value.format !== QBM_FORMAT)
    throw new Error("This is not a Qube Modeler project file.");
  if (value.formatVersion !== QBM_FORMAT_VERSION)
    throw new Error(
      `Unsupported .qbm format version: ${String(value.formatVersion)}.`,
    );
  if (!("project" in value))
    throw new Error("The .qbm file does not contain a project.");

  try {
    return validateProject(value.project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    throw new Error(`The project data cannot be loaded: ${message}`, {
      cause: error,
    });
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
