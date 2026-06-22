import { contextBridge, ipcRenderer } from "electron";
import type {
  QubeModelerApi,
  SaveProjectAsPayload,
  SaveProjectPayload,
} from "../src/core/qbm/ipc-types";

const api: QubeModelerApi = {
  openProject: () => ipcRenderer.invoke("qbm:open-project"),
  saveProject: (payload: SaveProjectPayload) =>
    ipcRenderer.invoke("qbm:save-project", payload),
  saveProjectAs: (payload: SaveProjectAsPayload) =>
    ipcRenderer.invoke("qbm:save-project-as", payload),
};

contextBridge.exposeInMainWorld("qubeModeler", api);
