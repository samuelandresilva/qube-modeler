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
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const MAX_WIDTH = 10000;
const MAX_HEIGHT = 10000;

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
      const normalized = normalizeWindowState(parsed);

      // Validate structures and bounds
      if (normalized) {
        if (typeof normalized.x === "number" && typeof normalized.y === "number") {
          // Check if bounds are visible on any display
          const displays = screen.getAllDisplays();
          const isVisible = displays.some((display) => {
            const db = display.bounds;
            return (
              normalized.x! < db.x + db.width &&
              normalized.x! + normalized.width > db.x &&
              normalized.y! < db.y + db.height &&
              normalized.y! + normalized.height > db.y
            );
          });

          if (isVisible) {
            return normalized;
          }
        } else {
          return normalized;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load window state:", error);
  }

  return defaultState;
}

function normalizeWindowState(state: Partial<WindowState>): WindowState | null {
  if (
    typeof state.width !== "number" ||
    typeof state.height !== "number" ||
    typeof state.isMaximized !== "boolean" ||
    typeof state.isFullScreen !== "boolean" ||
    !Number.isFinite(state.width) ||
    !Number.isFinite(state.height)
  ) {
    return null;
  }

  const normalized: WindowState = {
    width: clamp(Math.round(state.width), MIN_WIDTH, MAX_WIDTH),
    height: clamp(Math.round(state.height), MIN_HEIGHT, MAX_HEIGHT),
    isMaximized: state.isMaximized,
    isFullScreen: state.isFullScreen,
  };

  if (
    typeof state.x === "number" &&
    typeof state.y === "number" &&
    Number.isFinite(state.x) &&
    Number.isFinite(state.y)
  ) {
    normalized.x = Math.round(state.x);
    normalized.y = Math.round(state.y);
  }

  return normalized;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
