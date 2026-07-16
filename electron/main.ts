import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  OpenDialogOptions,
  shell,
  type WebContents,
} from "electron";
import { open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createQbmFile, parseQbmFile, type QbmFlywayConfig } from "../src/core/qbm/qbm-file";
import { loadWindowState, trackWindowState } from "./window-state";
import type { DatabaseProject } from "../src/core/model/types";
import type {
  OpenProjectResult,
  SaveProjectResult,
  ExportMigrationSqlResult,
  RecentProject,
  OpenProjectFileResult,
} from "../src/core/qbm/ipc-types";


app.commandLine.appendSwitch("log-level", "3");
app.setName("Qube Modeler");

let pendingQbmPath: string | null = null;
let rendererReadyForOpenFileRequests = false;

function getQbmFilePathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (hasQbmExtension(arg)) {
      return path.resolve(arg);
    }
  }
  return null;
}

function requestOpenQbmFile(filePath: string): void {
  const resolvedPath = path.resolve(filePath);
  if (!hasQbmExtension(resolvedPath)) return;

  if (mainWindow && rendererReadyForOpenFileRequests) {
    mainWindow.webContents.send("qbm:open-file-requested", resolvedPath);
    return;
  }

  pendingQbmPath = resolvedPath;
}

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const secondInstancePath = getQbmFilePathFromArgs(commandLine);
      if (secondInstancePath) {
        requestOpenQbmFile(secondInstancePath);
      }
    }
  });
}

// Listen to macOS file open
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (hasQbmExtension(filePath)) {
    requestOpenQbmFile(filePath);
  }
});

// Check if a path was passed via args on startup
const startupPath = getQbmFilePathFromArgs(process.argv);
if (startupPath) {
  pendingQbmPath = startupPath;
}

// Em ambientes ESM (como "type": "module" no package.json), __dirname não existe por padrão.
// O vite-plugin-electron lida com o bundling de forma que define __dirname corretamente em produção,
// mas fornecemos um fallback seguro para compatibilidade ESM.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appIconPath = app.isPackaged
  ? path.join(__dirname, "../build/icon.png")
  : path.join(process.cwd(), "build", "icon.png");

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let mainWindow: BrowserWindow | null = null;
let isWindowCloseConfirmed = false;
let closeRequestFallbackTimer: NodeJS.Timeout | null = null;

const qbmFileFilter = [{ name: "Qube Modeler Project", extensions: ["qbm"] }];

function getRecentProjectsFilePath(): string {
  return path.join(app.getPath("userData"), "recent-projects.json");
}

async function readRecentProjects(): Promise<RecentProject[]> {
  const filePath = getRecentProjectsFilePath();
  try {
    const data = await readFile(filePath, "utf8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is RecentProject => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.filePath === "string" &&
          typeof item.name === "string" &&
          typeof item.lastOpenedAt === "string"
        );
      });
    }
    return [];
  } catch {
    return [];
  }
}

async function saveRecentProjects(projects: RecentProject[]): Promise<void> {
  const filePath = getRecentProjectsFilePath();
  await writeFile(filePath, JSON.stringify(projects, null, 2), "utf8");
}

async function addRecentProject(filePath: string): Promise<RecentProject[]> {
  const projects = await readRecentProjects();
  const name = path.basename(filePath, path.extname(filePath));
  const newProject: RecentProject = {
    filePath,
    name,
    lastOpenedAt: new Date().toISOString(),
  };

  const filtered = projects.filter(
    (p) => p.filePath.toLowerCase() !== filePath.toLowerCase()
  );

  const updated = [newProject, ...filtered];

  updated.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());

  const limited = updated.slice(0, 10);

  await saveRecentProjects(limited);
  return limited;
}

async function removeRecentProject(filePath: string): Promise<RecentProject[]> {
  const projects = await readRecentProjects();
  const filtered = projects.filter(
    (p) => p.filePath.toLowerCase() !== filePath.toLowerCase()
  );
  await saveRecentProjects(filtered);
  return filtered;
}

function configureProjectIpc() {
  ipcMain.handle("qbm:get-recent-projects", async (): Promise<RecentProject[]> => {
    return readRecentProjects();
  });

  ipcMain.handle("qbm:add-recent-project", async (_event, filePath: string): Promise<RecentProject[]> => {
    return addRecentProject(filePath);
  });

  ipcMain.handle("qbm:remove-recent-project", async (_event, filePath: string): Promise<RecentProject[]> => {
    return removeRecentProject(filePath);
  });

  ipcMain.handle("qbm:open-project-file", async (_event, filePath: string): Promise<OpenProjectFileResult> => {
    try {
      if (!hasQbmExtension(filePath)) {
        return { error: "Only .qbm files can be opened." };
      }
      const raw = await readFile(filePath, "utf8");
      const { project, flyway } = parseQbmFile(raw);
      return {
        filePath,
        project,
        flyway,
      };
    } catch (error) {
      return {
        error: `Could not open the project: ${getErrorMessage(error)}`,
      };
    }
  });

  ipcMain.handle("qbm:get-pending-file", async (): Promise<string | null> => {
    rendererReadyForOpenFileRequests = true;
    const pathToSend = pendingQbmPath;
    pendingQbmPath = null;
    return pathToSend;
  });

  ipcMain.handle("qbm:get-app-version", async (): Promise<string> => {
    return app.getVersion();
  });

  ipcMain.on("qbm:confirm-close", (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return;
    if (closeRequestFallbackTimer) {
      clearTimeout(closeRequestFallbackTimer);
      closeRequestFallbackTimer = null;
    }
    isWindowCloseConfirmed = true;
    mainWindow.close();
  });

  ipcMain.handle(
    "qbm:open-project",
    async (event): Promise<OpenProjectResult> => {
      try {
        const owner = getOwnerWindow(event.sender);
        const options: OpenDialogOptions = {
          title: "Open Qube Modeler Project",
          properties: ["openFile"],
          filters: qbmFileFilter,
        };
        const result = owner
          ? await dialog.showOpenDialog(owner, options)
          : await dialog.showOpenDialog(options);

        if (result.canceled || result.filePaths.length === 0)
          return { canceled: true };

        const filePath = result.filePaths[0];
        if (!hasQbmExtension(filePath))
          return { canceled: false, error: "Only .qbm files can be opened." };

        const raw = await readFile(filePath, "utf8");
        const { project, flyway } = parseQbmFile(raw);
        return {
          canceled: false,
          filePath,
          project,
          flyway,
        };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not open the project: ${getErrorMessage(error)}`,
        };
      }
    },
  );

  ipcMain.handle(
    "qbm:save-project",
    async (_event, payload: unknown): Promise<SaveProjectResult> => {
      try {
        if (!isRecord(payload) || typeof payload.filePath !== "string")
          throw new Error("Invalid save request.");
        if (!hasQbmExtension(payload.filePath))
          throw new Error("The project path must use the .qbm extension.");

        await writeProjectFile(
          payload.filePath,
          payload.project as DatabaseProject,
          payload.flyway as QbmFlywayConfig,
        );
        return { canceled: false, filePath: payload.filePath };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not save the project: ${getErrorMessage(error)}`,
        };
      }
    },
  );

  ipcMain.handle(
    "qbm:save-project-as",
    async (event, payload: unknown): Promise<SaveProjectResult> => {
      try {
        if (!isRecord(payload)) throw new Error("Invalid save request.");

        const owner = getOwnerWindow(event.sender);
        const suggestedFileName = getSuggestedFileName(
          typeof payload.suggestedFileName === "string"
            ? payload.suggestedFileName
            : undefined,
        );
        const options = {
          title: "Save Qube Modeler Project",
          defaultPath: suggestedFileName,
          filters: qbmFileFilter,
        };
        const result = owner
          ? await dialog.showSaveDialog(owner, options)
          : await dialog.showSaveDialog(options);

        if (result.canceled || !result.filePath) return { canceled: true };

        const filePath = ensureQbmExtension(result.filePath);
        await writeProjectFile(
          filePath,
          payload.project as DatabaseProject,
          payload.flyway as QbmFlywayConfig,
        );
        return { canceled: false, filePath };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not save the project: ${getErrorMessage(error)}`,
        };
      }
    },
  );

  ipcMain.handle(
    "qbm:export-migration-sql",
    async (event, payload: unknown): Promise<ExportMigrationSqlResult> => {
      try {
        if (
          !isRecord(payload) ||
          typeof payload.fileName !== "string" ||
          typeof payload.sql !== "string"
        ) {
          throw new Error("Invalid export request.");
        }

        const owner = getOwnerWindow(event.sender);
        const options = {
          title: "Export Migration SQL",
          defaultPath: payload.fileName,
          filters: [{ name: "SQL Files", extensions: ["sql"] }],
        };
        const result = owner
          ? await dialog.showSaveDialog(owner, options)
          : await dialog.showSaveDialog(options);

        if (result.canceled || !result.filePath) {
          return { canceled: true };
        }

        await writeFile(result.filePath, payload.sql, "utf8");
        return { canceled: false, filePath: result.filePath };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not export migration SQL: ${getErrorMessage(error)}`,
        };
      }
    },
  );
}

async function writeProjectFile(
  filePath: string,
  project: DatabaseProject,
  flyway: QbmFlywayConfig,
): Promise<void> {
  const nameWithoutExtension = path.basename(filePath, path.extname(filePath));
  const updatedProject = {
    ...project,
    name: nameWithoutExtension,
  };
  const qbmFile = createQbmFile(updatedProject, flyway, app.getVersion());
  const serializedProject = JSON.stringify(qbmFile, null, 2);
  await writeFileAtomically(filePath, serializedProject);
}

async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const tempPath = path.join(
    directory,
    `.${fileName}.${process.pid}.${Date.now()}.tmp`,
  );

  let handle: Awaited<ReturnType<typeof open>> | null = null;

  try {
    handle = await open(tempPath, "w");
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(tempPath, filePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

function getOwnerWindow(webContents: WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(webContents) ?? mainWindow;
}

function hasQbmExtension(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".qbm";
}

function ensureQbmExtension(filePath: string): string {
  return hasQbmExtension(filePath) ? filePath : `${filePath}.qbm`;
}

function getSuggestedFileName(suggestedFileName?: string): string {
  const fallback = "qube-modeler-project";
  const safeName = path
    .basename(suggestedFileName?.trim() || fallback)
    .replace(/[<>:"/\\|?*]/g, "-")
    .split("")
    .map((character) => (character.charCodeAt(0) < 32 ? "-" : character))
    .join("");
  return ensureQbmExtension(safeName || fallback);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function configureApplicationMenu() {
  app.setName("Qube Modeler");

  if (process.platform === "darwin") {
    // macOS sempre tem a barra global do sistema.
    // Aqui deixamos o menu o mais vazio/limpo possível.
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "Qube Modeler",
          submenu: [],
        },
      ]),
    );

    return;
  }

  // Windows/Linux: remove totalmente a barra de menu nativa.
  Menu.setApplicationMenu(null);
}

function createWindow() {
  isWindowCloseConfirmed = false;
  rendererReadyForOpenFileRequests = false;
  closeRequestFallbackTimer = null;
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: "#020817",
    title: "Qube Modeler",
    icon: appIconPath,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#020817",
      symbolColor: "#dbeafe",
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  trackWindowState(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    if (state.isMaximized) {
      mainWindow?.maximize();
    }
    if (state.isFullScreen) {
      mainWindow?.setFullScreen(true);
    }
    mainWindow?.show();
  });

  mainWindow.on("close", (event) => {
    if (isWindowCloseConfirmed) return;
    event.preventDefault();
    mainWindow?.webContents.send("qbm:close-requested");
    if (closeRequestFallbackTimer) return;
    closeRequestFallbackTimer = setTimeout(async () => {
      closeRequestFallbackTimer = null;
      if (!mainWindow || isWindowCloseConfirmed) return;

      const result = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Cancel", "Close anyway"],
        defaultId: 0,
        cancelId: 0,
        title: "Close Qube Modeler?",
        message: "Qube Modeler is not responding to the close request.",
        detail:
          "Closing anyway may discard unsaved changes in the current project.",
      });

      if (result.response === 1 && mainWindow) {
        isWindowCloseConfirmed = true;
        mainWindow.close();
      }
    }, 5000);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    if (closeRequestFallbackTimer) {
      clearTimeout(closeRequestFallbackTimer);
      closeRequestFallbackTimer = null;
    }
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock?.setIcon(nativeImage.createFromPath(appIconPath));
  }
  configureApplicationMenu();
  configureProjectIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
