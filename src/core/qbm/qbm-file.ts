import type { DatabaseProject } from "../model/types";
import { validateProject } from "../validation/project";

export const QBM_FORMAT = "qube-modeler-project" as const;
export const QBM_FORMAT_VERSION = 1 as const;

export type QbmFlywayManualScript = {
  id: string;
  name: string;
  execution: "before" | "after";
  order: number;
  sql: string;
};

export type QbmFlywayVersion = {
  id: string;
  version: string;
  description: string;
  fileName: string;
  createdAt: string;
  projectSnapshot: DatabaseProject;
  generatedSql: string;
  manualScripts: QbmFlywayManualScript[];
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
    flyway: validateQbmFlywayConfig(flyway),
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
    throw new Error("The selected .qbm file is not valid.");
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

  if (!("flyway" in value)) {
    throw new Error("The .qbm file does not contain a flyway migration history.");
  }

  let flyway: QbmFlywayConfig;
  try {
    flyway = validateQbmFlywayConfig(value.flyway);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    throw new Error(`The flyway migration history cannot be loaded: ${message}`, {
      cause: error,
    });
  }

  return { project, flyway };
}

export function validateQbmFlywayConfig(flyway: unknown): QbmFlywayConfig {
  if (!isObject(flyway)) throw new Error("Flyway data must be an object.");
  if (!Array.isArray(flyway.versions))
    throw new Error("Flyway versions must be an array.");

  const ids = new Set<string>();
  const versions = new Set<string>();
  const fileNames = new Set<string>();

  return {
    versions: flyway.versions.map((version, index) =>
      validateQbmFlywayVersion(version, index, ids, versions, fileNames),
    ),
  };
}

function validateQbmFlywayVersion(
  version: unknown,
  index: number,
  ids: Set<string>,
  versions: Set<string>,
  fileNames: Set<string>,
): QbmFlywayVersion {
  const label = `Flyway version #${index + 1}`;
  if (!isObject(version)) throw new Error(`${label} must be an object.`);

  const id = readRequiredString(version.id, `${label} id`);
  const versionValue = readRequiredString(version.version, `${label} version`);
  const description = readRequiredString(
    version.description,
    `${label} description`,
  );
  const fileName = readRequiredString(version.fileName, `${label} fileName`);
  const createdAt = readRequiredString(version.createdAt, `${label} createdAt`);

  if (Number.isNaN(Date.parse(createdAt)))
    throw new Error(`${label} createdAt must be a valid date string.`);
  if (typeof version.generatedSql !== "string")
    throw new Error(`${label} generatedSql must be a string.`);
  if (!("projectSnapshot" in version))
    throw new Error(`${label} projectSnapshot is required.`);
  if (!Array.isArray(version.manualScripts))
    throw new Error(`${label} manualScripts must be an array.`);

  ensureUnique(ids, id, `${label} id`);
  ensureUnique(versions, versionValue, `${label} version`);
  ensureUnique(fileNames, fileName, `${label} fileName`);

  return {
    id,
    version: versionValue,
    description,
    fileName,
    createdAt,
    projectSnapshot: validateProject(version.projectSnapshot),
    generatedSql: version.generatedSql,
    manualScripts: version.manualScripts.map((manualScript, scriptIndex) =>
      validateQbmFlywayManualScript(
        manualScript,
        `${label} manual script #${scriptIndex + 1}`,
      ),
    ),
  };
}

function validateQbmFlywayManualScript(
  manualScript: unknown,
  label: string,
): QbmFlywayManualScript {
  if (!isObject(manualScript)) throw new Error(`${label} must be an object.`);

  const execution = manualScript.execution;
  if (execution !== "before" && execution !== "after")
    throw new Error(`${label} execution must be "before" or "after".`);
  if (
    typeof manualScript.order !== "number" ||
    !Number.isFinite(manualScript.order)
  )
    throw new Error(`${label} order must be a valid number.`);
  if (typeof manualScript.sql !== "string")
    throw new Error(`${label} sql must be a string.`);

  return {
    id: readRequiredString(manualScript.id, `${label} id`),
    name: readRequiredString(manualScript.name, `${label} name`),
    execution,
    order: manualScript.order,
    sql: manualScript.sql,
  };
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${fieldName} is required.`);
  return value;
}

function ensureUnique(values: Set<string>, value: string, fieldName: string): void {
  if (values.has(value)) throw new Error(`${fieldName} must be unique.`);
  values.add(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getProjectDisplayName(filePath: string | null): string {
  if (!filePath) return "Untitled";
  const parts = filePath.split(/[/\\]/);
  const baseName = parts[parts.length - 1];
  if (baseName.toLowerCase().endsWith(".qbm")) {
    return baseName.slice(0, -4);
  }
  return baseName;
}
