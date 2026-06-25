import type { DatabaseProject } from "../model/types";
import type { QbmFlywayConfig } from "./qbm-file";

export type OpenProjectResult =
  | { canceled: true }
  | { canceled: false; filePath: string; project: DatabaseProject; flyway: QbmFlywayConfig }
  | { canceled: false; error: string };

export type SaveProjectPayload = {
  filePath: string;
  project: DatabaseProject;
  flyway: QbmFlywayConfig;
};

export type SaveProjectAsPayload = {
  project: DatabaseProject;
  flyway: QbmFlywayConfig;
  suggestedFileName?: string;
};

export type SaveProjectResult =
  | { canceled: true }
  | { canceled: false; filePath: string }
  | { canceled: false; error: string };

export type ExportMigrationSqlPayload = {
  fileName: string;
  sql: string;
};

export type ExportMigrationSqlResult =
  | { canceled: true }
  | { canceled: false; filePath: string }
  | { canceled: false; error: string };

export type RecentProject = {
  filePath: string;
  name: string;
  lastOpenedAt: string;
};

export type OpenProjectFileResult =
  | { error: string }
  | { filePath: string; project: DatabaseProject; flyway: QbmFlywayConfig };

export type QubeModelerApi = {
  openProject(): Promise<OpenProjectResult>;
  saveProject(payload: SaveProjectPayload): Promise<SaveProjectResult>;
  saveProjectAs(payload: SaveProjectAsPayload): Promise<SaveProjectResult>;
  onCloseRequested(callback: () => void): () => void;
  confirmClose(): void;
  exportMigrationSql(payload: ExportMigrationSqlPayload): Promise<ExportMigrationSqlResult>;
  getRecentProjects(): Promise<RecentProject[]>;
  addRecentProject(filePath: string): Promise<RecentProject[]>;
  removeRecentProject(filePath: string): Promise<RecentProject[]>;
  openProjectFile(filePath: string): Promise<OpenProjectFileResult>;
};

