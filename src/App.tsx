import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { Canvas } from "@/app/canvas/Canvas";
import { ConfirmDialog } from "@/app/canvas/components/ConfirmDialog";
import { MessageDialog } from "@/app/canvas/components/MessageDialog";
import { UnsavedChangesDialog } from "@/app/canvas/components/UnsavedChangesDialog";
import { useConfirm } from "@/app/canvas/hooks/useConfirm";
import { createEmptyProject, type DatabaseProject } from "@/core/model";
import type { QubeModelerApi } from "@/core/qbm/ipc-types";
import { getProjectDisplayName, type QbmFile, type QbmFlywayConfig, type QbmFlywayVersion } from "@/core/qbm/qbm-file";
import { AppTitleBar } from "./app/canvas/components/AppTitleBar";
import { FlywayMigrationsScreen } from "@/app/canvas/components/FlywayMigrationsScreen";
import { WelcomeScreen } from "@/app/canvas/components/WelcomeScreen";
import type { RecentProject } from "@/core/qbm/ipc-types";

type OpenedProjectState = {
  project: DatabaseProject;
  filePath: string | null;
  flyway: QbmFlywayConfig;
  isDirty: boolean;
};

export default function App() {
  const [view, setView] = useState<"canvas" | "flyway" | "welcome">("welcome");
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [openedProject, setOpenedProject] = useState<OpenedProjectState>(() => ({
    project: createEmptyProject(),
    filePath: null,
    flyway: { versions: [] },
    // A new untouched project has no user changes to preserve yet.
    isDirty: false,
  }));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileOperationMessage, setFileOperationMessage] = useState<
    string | null
  >(null);
  const [isCloseRequested, setIsCloseRequested] = useState(false);
  const fileOperationInProgressRef = useRef(false);
  const { confirm, requestConfirm, dismissConfirm, acceptConfirm } =
    useConfirm();

  const beginFileOperation = useCallback((message: string): boolean => {
    if (fileOperationInProgressRef.current) return false;
    fileOperationInProgressRef.current = true;
    setFileOperationMessage(message);
    return true;
  }, []);

  const finishFileOperation = useCallback(() => {
    fileOperationInProgressRef.current = false;
    setFileOperationMessage(null);
  }, []);

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
      flyway: { versions: [] },
      isDirty: false,
    });
    setView("canvas");
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
    if (!beginFileOperation("Opening project...")) return;

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
        flyway: result.flyway,
        isDirty: false,
      });
      const updated = await api.addRecentProject(result.filePath).catch(() => null);
      if (updated) setRecentProjects(updated);
      setView("canvas");
    } catch (error) {
      setErrorMessage(
        `Could not open the project: ${getErrorMessage(error)}`,
      );
    } finally {
      finishFileOperation();
    }
  }, [beginFileOperation, finishFileOperation]);

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

  const handleSaveProjectAs = useCallback(async (): Promise<boolean> => {
    const projectBeingSaved = openedProject.project;
    const api = getQubeModelerApi();
    if (!api) {
      setErrorMessage(
        "The Electron preload is unavailable. Fully restart Qube Modeler and try again.",
      );
      return false;
    }
    if (!beginFileOperation("Saving project as...")) return false;

    try {
      const result = await api.saveProjectAs({
        project: projectBeingSaved,
        flyway: openedProject.filePath ? openedProject.flyway : { versions: [] },
        suggestedFileName: getProjectDisplayName(openedProject.filePath),
      });
      if (result.canceled) return false;
      if ("error" in result) {
        setErrorMessage(result.error);
        return false;
      }
      const nameWithoutExtension = getProjectDisplayName(result.filePath);
      setOpenedProject((current) => ({
        ...current,
        filePath: result.filePath,
        project: {
          ...current.project,
          name: nameWithoutExtension,
        },
        isDirty:
          current.project === projectBeingSaved ? false : current.isDirty,
      }));
      const updated = await api.addRecentProject(result.filePath).catch(() => null);
      if (updated) setRecentProjects(updated);
      return true;
    } catch (error) {
      setErrorMessage(
        `Could not save the project: ${getErrorMessage(error)}`,
      );
      return false;
    } finally {
      finishFileOperation();
    }
  }, [beginFileOperation, finishFileOperation, openedProject.project, openedProject.flyway, openedProject.filePath]);

  const handleSaveProject = useCallback(async (): Promise<boolean> => {
    if (!openedProject.filePath) {
      return handleSaveProjectAs();
    }

    const projectBeingSaved = openedProject.project;
    const api = getQubeModelerApi();
    if (!api) {
      setErrorMessage(
        "The Electron preload is unavailable. Fully restart Qube Modeler and try again.",
      );
      return false;
    }
    if (!beginFileOperation("Saving project...")) return false;

    try {
      const result = await api.saveProject({
        filePath: openedProject.filePath,
        project: projectBeingSaved,
        flyway: openedProject.flyway,
      });
      if (result.canceled) return false;
      if ("error" in result) {
        setErrorMessage(result.error);
        return false;
      }
      const nameWithoutExtension = getProjectDisplayName(result.filePath);
      setOpenedProject((current) => ({
        ...current,
        filePath: result.filePath,
        project: {
          ...current.project,
          name: nameWithoutExtension,
        },
        isDirty:
          current.project === projectBeingSaved ? false : current.isDirty,
      }));
      const updated = await api.addRecentProject(result.filePath).catch(() => null);
      if (updated) setRecentProjects(updated);
      return true;
    } catch (error) {
      setErrorMessage(
        `Could not save the project: ${getErrorMessage(error)}`,
      );
      return false;
    } finally {
      finishFileOperation();
    }
  }, [
    beginFileOperation,
    finishFileOperation,
    handleSaveProjectAs,
    openedProject.filePath,
    openedProject.project,
    openedProject.flyway,
  ]);

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

  useEffect(() => {
    const api = getQubeModelerApi();
    if (!api) return;

    return api.onCloseRequested(() => {
      if (openedProject.isDirty) {
        setIsCloseRequested(true);
      } else {
        api.confirmClose();
      }
    });
  }, [openedProject.isDirty]);

  const discardChangesAndClose = useCallback(() => {
    setIsCloseRequested(false);
    getQubeModelerApi()?.confirmClose();
  }, []);

  const saveChangesAndClose = useCallback(async () => {
    const saved = await handleSaveProject();
    if (!saved) return;
    setIsCloseRequested(false);
    getQubeModelerApi()?.confirmClose();
  }, [handleSaveProject]);

  useEffect(() => {
    const api = getQubeModelerApi();
    if (api) {
      api.getRecentProjects().then(setRecentProjects).catch(() => {});
    }
  }, []);

  const handleOpenRecentProject = useCallback(async (filePath: string) => {
    const api = getQubeModelerApi();
    if (!api) {
      setErrorMessage("The Electron preload is unavailable.");
      return;
    }
    if (!beginFileOperation("Opening project...")) return;
    try {
      const result = await api.openProjectFile(filePath);
      if ("error" in result) {
        finishFileOperation();
        requestConfirm(
          `Could not open the project. It might have been moved or deleted.\nError: ${result.error}\nDo you want to remove it from the recent projects list?`,
          async () => {
            const updated = await api.removeRecentProject(filePath);
            setRecentProjects(updated);
          },
          "Remove",
        );
        return;
      }
      setOpenedProject({
        project: result.project,
        filePath: result.filePath,
        flyway: result.flyway,
        isDirty: false,
      });
      const updated = await api.addRecentProject(result.filePath).catch(() => null);
      if (updated) setRecentProjects(updated);
      setView("canvas");
    } catch (error) {
      setErrorMessage(`Could not open the project: ${getErrorMessage(error)}`);
    } finally {
      finishFileOperation();
    }
  }, [beginFileOperation, finishFileOperation, requestConfirm]);

  const handleRemoveRecentProject = useCallback(async (filePath: string) => {
    const api = getQubeModelerApi();
    if (!api) return;
    try {
      const updated = await api.removeRecentProject(filePath);
      setRecentProjects(updated);
    } catch (error) {
      setErrorMessage(`Could not remove recent project: ${getErrorMessage(error)}`);
    }
  }, []);

  const handleCloseProject = useCallback(() => {
    const performClose = () => {
      setOpenedProject({
        project: createEmptyProject(),
        filePath: null,
        flyway: { versions: [] },
        isDirty: false,
      });
      setView("welcome");
    };

    if (openedProject.isDirty) {
      requestConfirm(
        "Discard the unsaved changes to the current project?",
        performClose,
        "Discard",
      );
    } else {
      performClose();
    }
  }, [openedProject.isDirty, requestConfirm]);

  const handleConfirmMigration = useCallback((newVersion: QbmFlywayVersion) => {
    setOpenedProject((current) => ({
      ...current,
      flyway: {
        ...current.flyway,
        versions: [...current.flyway.versions, newVersion],
      },
      isDirty: true,
    }));
  }, []);



  const windowTitle = view === "welcome"
    ? "Qube Modeler"
    : `${getProjectDisplayName(openedProject.filePath)}${openedProject.isDirty ? " *" : ""} - Qube Modeler`;

  return (
    <div className="app-shell">
      <AppTitleBar title={windowTitle} />

      <div className="app-content">
        {view === "welcome" ? (
          <WelcomeScreen
            recentProjects={recentProjects}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onOpenRecentProject={handleOpenRecentProject}
            onRemoveRecentProject={handleRemoveRecentProject}
          />
        ) : view === "canvas" ? (
          <Canvas
            project={openedProject.project}
            filePath={openedProject.filePath}
            setProject={setProject}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onCloseProject={handleCloseProject}
            onSaveProject={() => void handleSaveProject()}
            onSaveProjectAs={() => void handleSaveProjectAs()}
            fileOperationMessage={fileOperationMessage}
            beginFileOperation={beginFileOperation}
            finishFileOperation={finishFileOperation}
            onFileOperationError={setErrorMessage}
            onViewFlyway={() => setView("flyway")}
          />
        ) : (
          <FlywayMigrationsScreen
            qbmFile={{
              format: "qube-modeler-project",
              formatVersion: 1,
              createdWith: {
                app: "Qube Modeler",
                version: "0.0.0",
              },
              savedAt: new Date().toISOString(),
              project: openedProject.project,
              flyway: openedProject.flyway,
            } as QbmFile}
            onBack={() => setView("canvas")}
            onConfirmMigration={handleConfirmMigration}
          />
        )}
      </div>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={acceptConfirm}
          onCancel={dismissConfirm}
        />
      )}
      {isCloseRequested && (
        <UnsavedChangesDialog
          onSave={() => void saveChangesAndClose()}
          onDiscard={discardChangesAndClose}
          onCancel={() => setIsCloseRequested(false)}
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
