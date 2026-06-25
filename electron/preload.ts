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
  getRecentProjects: () => ipcRenderer.invoke("qbm:get-recent-projects"),
  addRecentProject: (filePath: string) =>
    ipcRenderer.invoke("qbm:add-recent-project", filePath),
  removeRecentProject: (filePath: string) =>
    ipcRenderer.invoke("qbm:remove-recent-project", filePath),
  openProjectFile: (filePath: string) =>
    ipcRenderer.invoke("qbm:open-project-file", filePath),
};

contextBridge.exposeInMainWorld("qubeModeler", api);
