import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Main process entry
        entry: "electron/main.ts",
      },
      preload: {
        // Preload script entry
        input: "electron/preload.ts",
        vite: {
          build: {
            rolldownOptions: {
              output: {
                entryFileNames: "preload.cjs",
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "./",
});
