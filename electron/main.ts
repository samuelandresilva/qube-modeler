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
import { open, readFile, rename, unlink, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
const { Client } = pg;
import { createQbmFile, parseQbmFile, type QbmFlywayConfig } from "../src/core/qbm/qbm-file";
import { loadWindowState, trackWindowState } from "./window-state";
import type { DatabaseProject } from "../src/core/model/types";
import type {
  OpenProjectResult,
  SaveProjectResult,
  ExportMigrationSqlResult,
  RecentProject,
  OpenProjectFileResult,
  SelectDirectoryResult,
  GetDirectoryFilesResult,
  ExportMigrationsBatchResult,
  TestDbConnectionResult,
  FetchFlywayHistoryResult,
  RepairFlywayResult,
  FlywayHistoryRecord,
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
    throw new Error("Invalid structure in recent projects file.");
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    if (err && err.code !== "ENOENT") {
      console.error(`Recent projects file is corrupted: ${getErrorMessage(error)}`);
      try {
        const backupPath = `${filePath}.corrupted`;
        await rename(filePath, backupPath);
        console.error(`Corrupted file renamed to ${backupPath} for recovery.`);
      } catch (backupError) {
        console.error(`Failed to backup corrupted recent projects file: ${getErrorMessage(backupError)}`);
      }
    }
    return [];
  }
}

async function saveRecentProjects(projects: RecentProject[]): Promise<void> {
  const filePath = getRecentProjectsFilePath();
  await writeFile(filePath, JSON.stringify(projects, null, 2), "utf8");
}

async function addRecentProject(filePath: string): Promise<RecentProject[]> {
  const sanitized = sanitizeAndValidateQbmPath(filePath);
  const projects = await readRecentProjects();
  const name = path.basename(sanitized, path.extname(sanitized));
  const newProject: RecentProject = {
    filePath: sanitized,
    name,
    lastOpenedAt: new Date().toISOString(),
  };

  const filtered = projects.filter(
    (p) => p.filePath.toLowerCase() !== sanitized.toLowerCase()
  );

  const updated = [newProject, ...filtered];

  updated.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());

  const limited = updated.slice(0, 10);

  await saveRecentProjects(limited);
  return limited;
}

async function removeRecentProject(filePath: string): Promise<RecentProject[]> {
  const sanitized = sanitizeAndValidateQbmPath(filePath);
  const projects = await readRecentProjects();
  const filtered = projects.filter(
    (p) => p.filePath.toLowerCase() !== sanitized.toLowerCase()
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
      const sanitizedPath = sanitizeAndValidateQbmPath(filePath);
      const raw = await readFile(sanitizedPath, "utf8");
      const { project, flyway } = parseQbmFile(raw);
      return {
        filePath: sanitizedPath,
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
        const sanitizedPath = sanitizeAndValidateQbmPath(payload.filePath);

        await writeProjectFile(
          sanitizedPath,
          payload.project as DatabaseProject,
          payload.flyway as QbmFlywayConfig,
        );
        return { canceled: false, filePath: sanitizedPath };
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
        const sanitizedPath = sanitizeAndValidateQbmPath(filePath);
        await writeProjectFile(
          sanitizedPath,
          payload.project as DatabaseProject,
          payload.flyway as QbmFlywayConfig,
        );
        return { canceled: false, filePath: sanitizedPath };
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

  ipcMain.handle(
    "qbm:select-directory",
    async (event): Promise<SelectDirectoryResult> => {
      try {
        const owner = getOwnerWindow(event.sender);
        const options: OpenDialogOptions = {
          title: "Select Migrations Directory",
          properties: ["openDirectory", "createDirectory"],
        };
        const result = owner
          ? await dialog.showOpenDialog(owner, options)
          : await dialog.showOpenDialog(options);

        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true };
        }

        return { canceled: false, directoryPath: result.filePaths[0] };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not select directory: ${getErrorMessage(error)}`,
        };
      }
    },
  );

  ipcMain.handle(
    "qbm:get-directory-files",
    async (_event, directoryPath: unknown): Promise<GetDirectoryFilesResult> => {
      try {
        if (typeof directoryPath !== "string" || !directoryPath.trim()) {
          return { files: [] };
        }
        const entries = await readdir(directoryPath, { withFileTypes: true });
        const files = entries
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name);
        return { files };
      } catch (error) {
        return { error: `Could not read directory files: ${getErrorMessage(error)}` };
      }
    },
  );

  ipcMain.handle(
    "qbm:export-migrations-batch",
    async (_event, payload: unknown): Promise<ExportMigrationsBatchResult> => {
      try {
        if (
          !isRecord(payload) ||
          typeof payload.directoryPath !== "string" ||
          !Array.isArray(payload.files)
        ) {
          throw new Error("Invalid batch export request.");
        }

        const dir = payload.directoryPath;
        await mkdir(dir, { recursive: true });

        const exportedFiles: string[] = [];

        for (const item of payload.files) {
          if (
            isRecord(item) &&
            typeof item.fileName === "string" &&
            typeof item.sql === "string"
          ) {
            const targetPath = path.join(dir, item.fileName);
            await writeFile(targetPath, item.sql, "utf8");
            exportedFiles.push(item.fileName);
          }
        }

        return { canceled: false, count: exportedFiles.length, exportedFiles };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not export migrations batch: ${getErrorMessage(error)}`,
        };
      }
    },
  );

  ipcMain.handle(
    "qbm:test-db-connection",
    async (_event, config: unknown): Promise<TestDbConnectionResult> => {
      if (!isRecord(config) || typeof config.host !== "string" || typeof config.database !== "string" || typeof config.user !== "string") {
        return { success: false, error: "Invalid database connection parameters." };
      }

      const client = new Client({
        host: String(config.host),
        port: Number(config.port) || 5432,
        database: String(config.database),
        user: String(config.user),
        password: typeof config.password === "string" ? config.password : undefined,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });

      try {
        await client.connect();
        const res = await client.query<{ version: string }>("SELECT version()");
        await client.end();
        const serverVersion = res.rows[0]?.version || "PostgreSQL";
        return { success: true, serverVersion };
      } catch (error) {
        await client.end().catch(() => {});
        return { success: false, error: getErrorMessage(error) };
      }
    },
  );

  ipcMain.handle(
    "qbm:fetch-flyway-history",
    async (_event, config: unknown): Promise<FetchFlywayHistoryResult> => {
      if (!isRecord(config) || typeof config.host !== "string" || typeof config.database !== "string" || typeof config.user !== "string") {
        return { success: false, error: "Invalid database connection parameters." };
      }

      const schema = typeof config.schema === "string" && config.schema.trim() ? config.schema.trim() : "public";
      const client = new Client({
        host: String(config.host),
        port: Number(config.port) || 5432,
        database: String(config.database),
        user: String(config.user),
        password: typeof config.password === "string" ? config.password : undefined,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });

      try {
        await client.connect();
        // Check if flyway table exists
        const tableCheck = await client.query<{ exists: boolean }>(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = 'flyway_schema_history'
          ) as exists`,
          [schema]
        );

        if (!tableCheck.rows[0]?.exists) {
          await client.end();
          return { success: true, history: [] };
        }

        const query = `
          SELECT 
            installed_rank as "installedRank",
            version,
            description,
            type,
            script,
            checksum,
            installed_by as "installedBy",
            installed_on::text as "installedOn",
            execution_time as "executionTime",
            success
          FROM "${schema}"."flyway_schema_history"
          ORDER BY installed_rank ASC
        `;

        const res = await client.query<FlywayHistoryRecord>(query);
        await client.end();
        return { success: true, history: res.rows };
      } catch (error) {
        await client.end().catch(() => {});
        return { success: false, error: getErrorMessage(error) };
      }
    },
  );

  ipcMain.handle(
    "qbm:repair-flyway-failed-migrations",
    async (_event, config: unknown): Promise<RepairFlywayResult> => {
      if (!isRecord(config) || typeof config.host !== "string" || typeof config.database !== "string" || typeof config.user !== "string") {
        return { success: false, error: "Invalid database connection parameters." };
      }

      const schema = typeof config.schema === "string" && config.schema.trim() ? config.schema.trim() : "public";
      const client = new Client({
        host: String(config.host),
        port: Number(config.port) || 5432,
        database: String(config.database),
        user: String(config.user),
        password: typeof config.password === "string" ? config.password : undefined,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });

      try {
        await client.connect();
        const deleteRes = await client.query(
          `DELETE FROM "${schema}"."flyway_schema_history" WHERE success = false`
        );
        await client.end();
        const deletedCount = deleteRes.rowCount ?? 0;
        return {
          success: true,
          message: deletedCount === 0
            ? "No failed migrations found to repair."
            : `Successfully repaired ${deletedCount} failed migration record(s).`,
        };
      } catch (error) {
        await client.end().catch(() => {});
        return { success: false, error: getErrorMessage(error) };
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

function sanitizeAndValidateQbmPath(filePath: string): string {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("Invalid file path: path must be a non-empty string.");
  }
  const normalized = path.normalize(filePath);
  if (!path.isAbsolute(normalized)) {
    throw new Error("Invalid file path: path must be absolute.");
  }
  const resolved = path.resolve(normalized);
  if (resolved.includes("..") || resolved.includes("/../") || resolved.includes("\\..\\")) {
    throw new Error("Invalid file path: directory traversal attempt detected.");
  }
  if (path.extname(resolved).toLowerCase() !== ".qbm") {
    throw new Error("Invalid file path: file must have .qbm extension.");
  }
  return resolved;
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
