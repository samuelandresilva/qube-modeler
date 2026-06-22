import type { DatabaseProject } from "../model/types";

export type OpenProjectResult =
  | { canceled: true }
  | { canceled: false; filePath: string; project: DatabaseProject }
  | { canceled: false; error: string };

export type SaveProjectPayload = {
  filePath: string;
  project: DatabaseProject;
};

export type SaveProjectAsPayload = {
  project: DatabaseProject;
  suggestedFileName?: string;
};

export type SaveProjectResult =
  | { canceled: true }
  | { canceled: false; filePath: string }
  | { canceled: false; error: string };

export type QubeModelerApi = {
  openProject(): Promise<OpenProjectResult>;
  saveProject(payload: SaveProjectPayload): Promise<SaveProjectResult>;
  saveProjectAs(payload: SaveProjectAsPayload): Promise<SaveProjectResult>;
  onCloseRequested(callback: () => void): () => void;
  confirmClose(): void;
};
