import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { Canvas } from "@/app/canvas/Canvas";
import { ConfirmDialog } from "@/app/canvas/components/ConfirmDialog";
import { MessageDialog } from "@/app/canvas/components/MessageDialog";
import { useConfirm } from "@/app/canvas/hooks/useConfirm";
import { createEmptyProject, type DatabaseProject } from "@/core/model";
import type { QubeModelerApi } from "@/core/qbm/ipc-types";
import { AppTitleBar } from "./app/canvas/components/AppTitleBar";

type OpenedProjectState = {
  project: DatabaseProject;
  filePath: string | null;
  isDirty: boolean;
};

export default function App() {
  const [openedProject, setOpenedProject] = useState<OpenedProjectState>(() => ({
    project: createEmptyProject(),
    filePath: null,
    // A new untouched project has no user changes to preserve yet.
    isDirty: false,
  }));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { confirm, requestConfirm, dismissConfirm, acceptConfirm } =
    useConfirm();

  const setProject: Dispatch<SetStateAction<DatabaseProject>> = useCallback(
    (action) => {
      setOpenedProject((current) => {
        const project =
          typeof action === "function" ? action(current.project) : action;
        if (project === current.project) return current;
        return { ...current, project, isDirty: true };
      });
    },
    [],
  );

  const createNewProject = useCallback(() => {
    setOpenedProject({
      project: createEmptyProject(),
      filePath: null,
      isDirty: false,
    });
  }, []);

  const handleNewProject = useCallback(() => {
    if (!openedProject.isDirty) {
      createNewProject();
      return;
    }
    requestConfirm(
      "Discard the unsaved changes to the current project?",
      createNewProject,
      "Discard",
    );
  }, [createNewProject, openedProject.isDirty, requestConfirm]);

  const openProject = useCallback(async () => {
    const api = getQubeModelerApi();
    if (!api) {
      setErrorMessage(
        "The Electron preload is unavailable. Fully restart Qube Modeler and try again.",
      );
      return;
    }

    try {
      const result = await api.openProject();
      if (result.canceled) return;
      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }
      setOpenedProject({
        project: result.project,
        filePath: result.filePath,
        isDirty: false,
      });
    } catch (error) {
      setErrorMessage(
        `Could not open the project: ${getErrorMessage(error)}`,
      );
    }
  }, []);

  const handleOpenProject = useCallback(() => {
    if (!openedProject.isDirty) {
      void openProject();
      return;
    }
    requestConfirm(
      "Discard the unsaved changes to the current project?",
      () => void openProject(),
      "Discard",
    );
  }, [openProject, openedProject.isDirty, requestConfirm]);

  const handleSaveProjectAs = useCallback(async () => {
    const projectBeingSaved = openedProject.project;
    const api = getQubeModelerApi();
    if (!api) {
      setErrorMessage(
        "The Electron preload is unavailable. Fully restart Qube Modeler and try again.",
      );
      return;
    }

    try {
      const result = await api.saveProjectAs({
        project: projectBeingSaved,
        suggestedFileName: openedProject.project.name,
      });
      if (result.canceled) return;
      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }
      setOpenedProject((current) => ({
        ...current,
        filePath: result.filePath,
        isDirty:
          current.project === projectBeingSaved ? false : current.isDirty,
      }));
    } catch (error) {
      setErrorMessage(
        `Could not save the project: ${getErrorMessage(error)}`,
      );
    }
  }, [openedProject.project]);

  const handleSaveProject = useCallback(async () => {
    if (!openedProject.filePath) {
      await handleSaveProjectAs();
      return;
    }

    const projectBeingSaved = openedProject.project;
    const api = getQubeModelerApi();
    if (!api) {
      setErrorMessage(
        "The Electron preload is unavailable. Fully restart Qube Modeler and try again.",
      );
      return;
    }

    try {
      const result = await api.saveProject({
        filePath: openedProject.filePath,
        project: projectBeingSaved,
      });
      if (result.canceled) return;
      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }
      setOpenedProject((current) => ({
        ...current,
        filePath: result.filePath,
        isDirty:
          current.project === projectBeingSaved ? false : current.isDirty,
      }));
    } catch (error) {
      setErrorMessage(
        `Could not save the project: ${getErrorMessage(error)}`,
      );
    }
  }, [handleSaveProjectAs, openedProject.filePath, openedProject.project]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void (event.shiftKey ? handleSaveProjectAs() : handleSaveProject());
      } else if (key === "o" && !event.shiftKey) {
        event.preventDefault();
        void handleOpenProject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenProject, handleSaveProject, handleSaveProjectAs]);

  const windowTitle = `${openedProject.project.name}${openedProject.isDirty ? " *" : ""} — Qube Modeler`;

  return (
    <div className="app-shell">
      <AppTitleBar title={windowTitle} />

      <div className="app-content">
        <Canvas
          project={openedProject.project}
          setProject={setProject}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={() => void handleSaveProject()}
          onSaveProjectAs={() => void handleSaveProjectAs()}
        />
      </div>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={acceptConfirm}
          onCancel={dismissConfirm}
        />
      )}
      {errorMessage && (
        <MessageDialog
          title="Error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}

function getQubeModelerApi(): QubeModelerApi | null {
  return window.qubeModeler ?? null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
