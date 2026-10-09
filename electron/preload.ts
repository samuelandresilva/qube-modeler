import { contextBridge, ipcRenderer } from "electron";
import type {
  QubeModelerApi,
  SaveProjectAsPayload,
  SaveProjectPayload,
  ExportMigrationSqlPayload,
} from "../src/core/qbm/ipc-types";

const api: QubeModelerApi = {
  openProject: () => ipcRenderer.invoke("qbm:open-project"),
  saveProject: (payload: SaveProjectPayload) =>
    ipcRenderer.invoke("qbm:save-project", payload),
  saveProjectAs: (payload: SaveProjectAsPayload) =>
    ipcRenderer.invoke("qbm:save-project-as", payload),
  onCloseRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("qbm:close-requested", listener);
    return () => ipcRenderer.removeListener("qbm:close-requested", listener);
  },
  confirmClose: () => ipcRenderer.send("qbm:confirm-close"),
  exportMigrationSql: (payload: ExportMigrationSqlPayload) =>
    ipcRenderer.invoke("qbm:export-migration-sql", payload),
  selectDirectory: () => ipcRenderer.invoke("qbm:select-directory"),
  getDirectoryFiles: (directoryPath: string) =>
    ipcRenderer.invoke("qbm:get-directory-files", directoryPath),
  exportMigrationsBatch: (payload: import("../src/core/qbm/ipc-types").ExportMigrationsBatchPayload) =>
    ipcRenderer.invoke("qbm:export-migrations-batch", payload),
  testDbConnection: (config: import("../src/core/qbm/qbm-file").QbmDatabaseConnectionConfig) =>
    ipcRenderer.invoke("qbm:test-db-connection", config),
  fetchFlywayHistory: (config: import("../src/core/qbm/qbm-file").QbmDatabaseConnectionConfig) =>
    ipcRenderer.invoke("qbm:fetch-flyway-history", config),
  repairFlywayFailedMigrations: (config: import("../src/core/qbm/qbm-file").QbmDatabaseConnectionConfig) =>
    ipcRenderer.invoke("qbm:repair-flyway-failed-migrations", config),
  getProjectDbConnection: (filePath: string) =>
    ipcRenderer.invoke("qbm:get-project-db-connection", filePath),
  saveProjectDbConnection: (filePath: string, connection?: import("../src/core/qbm/qbm-file").QbmDatabaseConnectionConfig) =>
    ipcRenderer.invoke("qbm:save-project-db-connection", { filePath, connection }),
  getRecentProjects: () => ipcRenderer.invoke("qbm:get-recent-projects"),
  addRecentProject: (filePath: string) =>
    ipcRenderer.invoke("qbm:add-recent-project", filePath),
  removeRecentProject: (filePath: string) =>
    ipcRenderer.invoke("qbm:remove-recent-project", filePath),
  openProjectFile: (filePath: string) =>
    ipcRenderer.invoke("qbm:open-project-file", filePath),
  getPendingFile: () => ipcRenderer.invoke("qbm:get-pending-file"),
  getAppVersion: () => ipcRenderer.invoke("qbm:get-app-version"),
  onOpenFileRequested: (callback: (filePath: string) => void) => {
    const listener = (_event: import("electron").IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on("qbm:open-file-requested", listener);
    return () => ipcRenderer.removeListener("qbm:open-file-requested", listener);
  },
};

contextBridge.exposeInMainWorld("qubeModeler", api);
