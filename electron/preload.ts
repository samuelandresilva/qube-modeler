import { contextBridge, ipcRenderer } from "electron";

// Expõe APIs nativas seguras para o processo renderer (UI React) no objeto global window.electronAPI
contextBridge.exposeInMainWorld("electronAPI", {
  // Caso queira adicionar chamadas IPC customizadas no futuro (como salvar arquivos ou diálogos locais):
  ping: () => ipcRenderer.invoke("ping"),
});
