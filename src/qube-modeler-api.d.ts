import type { QubeModelerApi } from "./core/qbm/ipc-types";

declare global {
  interface Window {
    qubeModeler?: QubeModelerApi;
  }
}

export {};
