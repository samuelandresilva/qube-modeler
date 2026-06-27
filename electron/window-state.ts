import { app, screen, BrowserWindow } from "electron";
import * as path from "path";
import * as fs from "fs";

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 800;

export function getWindowStatePath(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

export function loadWindowState(): WindowState {
  const filePath = getWindowStatePath();
  const defaultState: WindowState = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    isMaximized: false,
    isFullScreen: false,
  };

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data) as WindowState;

      // Validate structures and bounds
      if (
        typeof parsed.width === "number" &&
        typeof parsed.height === "number" &&
        typeof parsed.isMaximized === "boolean" &&
        typeof parsed.isFullScreen === "boolean"
      ) {
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Check if bounds are visible on any display
          const displays = screen.getAllDisplays();
          const isVisible = displays.some((display) => {
            const db = display.bounds;
            return (
              parsed.x! < db.x + db.width &&
              parsed.x! + parsed.width > db.x &&
              parsed.y! < db.y + db.height &&
              parsed.y! + parsed.height > db.y
            );
          });

          if (isVisible) {
            return parsed;
          }
        } else {
          return parsed;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load window state:", error);
  }

  return defaultState;
}

export function saveWindowState(window: BrowserWindow) {
  try {
    const isMaximized = window.isMaximized();
    const isFullScreen = window.isFullScreen();
    const bounds = window.getNormalBounds();

    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
      isFullScreen,
    };

    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save window state:", error);
  }
}

export function trackWindowState(window: BrowserWindow) {
  const saveState = () => saveWindowState(window);

  window.on("resize", saveState);
  window.on("move", saveState);
  window.on("close", saveState);
}
