import type { DatabaseProject } from "../model/types";
import { validateProject } from "../validation/project";

export const QBM_FORMAT = "qube-modeler-project" as const;
export const QBM_FORMAT_VERSION = 1 as const;

export type QbmFlywayVersion = {
  id: string;
  version: string;
  description: string;
  fileName: string;
  createdAt: string;
  projectSnapshot: DatabaseProject;
  generatedSql: string;
};

export type QbmFlywayConfig = {
  versions: QbmFlywayVersion[];
};

export type QbmFile = {
  format: typeof QBM_FORMAT;
  formatVersion: typeof QBM_FORMAT_VERSION;
  createdWith: {
    app: "Qube Modeler";
    version: string;
  };
  savedAt: string;
  project: DatabaseProject;
  flyway: QbmFlywayConfig;
};

export function createQbmFile(
  project: DatabaseProject,
  flyway: QbmFlywayConfig,
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
    flyway: flyway,
  };
}

export function parseQbmFile(raw: string): {
  project: DatabaseProject;
  flyway: QbmFlywayConfig;
} {
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

  let project: DatabaseProject;
  try {
    project = validateProject(value.project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    throw new Error(`The project data cannot be loaded: ${message}`, {
      cause: error,
    });
  }

  let flyway: QbmFlywayConfig = { versions: [] };
  if ("flyway" in value && isObject(value.flyway) && Array.isArray(value.flyway.versions)) {
    const versions: QbmFlywayVersion[] = [];
    for (const v of value.flyway.versions) {
      if (
        isObject(v) &&
        typeof v.id === "string" &&
        typeof v.version === "string" &&
        typeof v.description === "string" &&
        typeof v.fileName === "string" &&
        typeof v.createdAt === "string" &&
        typeof v.generatedSql === "string" &&
        v.projectSnapshot
      ) {
        try {
          versions.push({
            id: v.id,
            version: v.version,
            description: v.description,
            fileName: v.fileName,
            createdAt: v.createdAt,
            projectSnapshot: validateProject(v.projectSnapshot),
            generatedSql: v.generatedSql,
          });
        } catch {
          // Se a validação do snapshot falhar, podemos manter o snapshot como está
          versions.push({
            id: v.id,
            version: v.version,
            description: v.description,
            fileName: v.fileName,
            createdAt: v.createdAt,
            projectSnapshot: v.projectSnapshot as DatabaseProject,
            generatedSql: v.generatedSql,
          });
        }
      }
    }
    flyway = { versions };
  }

  return { project, flyway };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
