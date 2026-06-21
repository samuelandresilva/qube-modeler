import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

app.commandLine.appendSwitch("log-level", "3");

// Em ambientes ESM (como "type": "module" no package.json), __dirname não existe por padrão.
// O vite-plugin-electron lida com o bundling de forma que define __dirname corretamente em produção,
// mas fornecemos um fallback seguro para compatibilidade ESM.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Qube Modeler",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#020817",
      symbolColor: "#dbeafe",
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();

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
