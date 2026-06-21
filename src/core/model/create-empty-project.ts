import type { DatabaseProject } from "./database-project";

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
        diagram: {
            tableNodes: [],
        },
    };
}