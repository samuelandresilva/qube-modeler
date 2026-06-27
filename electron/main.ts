import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  OpenDialogOptions,
  type WebContents,
} from "electron";
import { readFile, writeFile } from "node:fs/promises";
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

// Em ambientes ESM (como "type": "module" no package.json), __dirname não existe por padrão.
// O vite-plugin-electron lida com o bundling de forma que define __dirname corretamente em produção,
// mas fornecemos um fallback seguro para compatibilidade ESM.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appIconPath = path.join(process.cwd(), "build", "icon.png");

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let mainWindow: BrowserWindow | null = null;
let isWindowCloseConfirmed = false;

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

  ipcMain.on("qbm:confirm-close", (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return;
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
  await writeFile(filePath, JSON.stringify(qbmFile, null, 2), "utf8");
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
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
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
