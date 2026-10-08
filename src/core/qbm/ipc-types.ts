import type { DatabaseProject } from "../model/types";
import type { QbmFlywayConfig } from "./qbm-file";

export type OpenProjectResult =
  | { canceled: true }
  | {
      canceled: false;
      filePath: string;
      project: DatabaseProject;
      flyway: QbmFlywayConfig;
      createdWith?: {
        app: string;
        version: string;
      };
      savedAt?: string;
    }
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
  | {
      filePath: string;
      project: DatabaseProject;
      flyway: QbmFlywayConfig;
      createdWith?: {
        app: string;
        version: string;
      };
      savedAt?: string;
    };

export type SelectDirectoryResult =
  | { canceled: true }
  | { canceled: false; directoryPath: string }
  | { canceled: false; error: string };

export type ExportMigrationsBatchFile = {
  fileName: string;
  sql: string;
};

export type ExportMigrationsBatchPayload = {
  directoryPath: string;
  files: ExportMigrationsBatchFile[];
};

export type ExportMigrationsBatchResult =
  | { canceled: false; count: number; exportedFiles: string[] }
  | { canceled: false; error: string };

export type GetDirectoryFilesResult =
  | { files: string[] }
  | { error: string };

export type FlywayHistoryRecord = {
  installedRank: number;
  version: string | null;
  description: string;
  type: string;
  script: string;
  checksum: number | null;
  installedBy: string;
  installedOn: string;
  executionTime: number;
  success: boolean;
};

export type TestDbConnectionResult =
  | { success: true; serverVersion: string }
  | { success: false; error: string };

export type FetchFlywayHistoryResult =
  | { success: true; history: FlywayHistoryRecord[] }
  | { success: false; error: string };

export type RepairFlywayResult =
  | { success: true; message: string }
  | { success: false; error: string };


export type QubeModelerApi = {
  openProject(): Promise<OpenProjectResult>;
  saveProject(payload: SaveProjectPayload): Promise<SaveProjectResult>;
  saveProjectAs(payload: SaveProjectAsPayload): Promise<SaveProjectResult>;
  onCloseRequested(callback: () => void): () => void;
  confirmClose(): void;
  exportMigrationSql(payload: ExportMigrationSqlPayload): Promise<ExportMigrationSqlResult>;
  selectDirectory(): Promise<SelectDirectoryResult>;
  getDirectoryFiles(directoryPath: string): Promise<GetDirectoryFilesResult>;
  exportMigrationsBatch(payload: ExportMigrationsBatchPayload): Promise<ExportMigrationsBatchResult>;
  testDbConnection(config: import("./qbm-file").QbmDatabaseConnectionConfig): Promise<TestDbConnectionResult>;
  fetchFlywayHistory(config: import("./qbm-file").QbmDatabaseConnectionConfig): Promise<FetchFlywayHistoryResult>;
  repairFlywayFailedMigrations(config: import("./qbm-file").QbmDatabaseConnectionConfig): Promise<RepairFlywayResult>;
  getRecentProjects(): Promise<RecentProject[]>;
  addRecentProject(filePath: string): Promise<RecentProject[]>;
  removeRecentProject(filePath: string): Promise<RecentProject[]>;
  openProjectFile(filePath: string): Promise<OpenProjectFileResult>;
  getPendingFile(): Promise<string | null>;
  getAppVersion(): Promise<string>;
  onOpenFileRequested(callback: (filePath: string) => void): () => void;
};


