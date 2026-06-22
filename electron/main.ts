import { app, BrowserWindow, Menu, nativeImage } from "electron";
import path from "path";
import { fileURLToPath } from "url";

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
  if (process.platform === "darwin") {
    app.dock?.setIcon(nativeImage.createFromPath(appIconPath));
  }
  configureApplicationMenu();
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
