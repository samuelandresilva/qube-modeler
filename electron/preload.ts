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
  onCloseRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("qbm:close-requested", listener);
    return () => ipcRenderer.removeListener("qbm:close-requested", listener);
  },
  confirmClose: () => ipcRenderer.send("qbm:confirm-close"),
};

contextBridge.exposeInMainWorld("qubeModeler", api);
