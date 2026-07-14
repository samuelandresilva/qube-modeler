import type { DatabaseProject } from "./types";

export function createEmptyProject(): DatabaseProject {
  return {
    id: crypto.randomUUID(),
    name: "blank project",
    engine: "postgresql",
    schemas: [
      {
        id: crypto.randomUUID(),
        name: "public",
        sequences: [],
        tables: [],
      },
    ],
    diagram: { tableNodes: [] },
    functions: [],
    views: [],
  };
}
