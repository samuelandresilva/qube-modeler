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
import { createQbmFile, parseQbmFile } from "../src/core/qbm/qbm-file";
import type { DatabaseProject } from "../src/core/model/types";
import type {
  OpenProjectResult,
  SaveProjectResult,
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

function configureProjectIpc() {
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
        const options : OpenDialogOptions = {
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
        return {
          canceled: false,
          filePath,
          project: parseQbmFile(raw),
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
        await writeProjectFile(filePath, payload.project as DatabaseProject);
        return { canceled: false, filePath };
      } catch (error) {
        return {
          canceled: false,
          error: `Could not save the project: ${getErrorMessage(error)}`,
        };
      }
    },
  );
}

async function writeProjectFile(
  filePath: string,
  project: DatabaseProject,
): Promise<void> {
  const qbmFile = createQbmFile(project, app.getVersion());
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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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

  mainWindow.maximize();

  mainWindow.on("close", (event) => {
    if (isWindowCloseConfirmed) return;
    event.preventDefault();
    mainWindow?.webContents.send("qbm:close-requested");
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
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
