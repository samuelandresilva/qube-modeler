import type { DatabaseProject } from "./database-project";

export function addSchema(project: DatabaseProject): DatabaseProject {
    const nextSchemaNumber = project.schemas.length + 1;

    return {
        ...project,
        schemas: [
            ...project.schemas,
            {
                id: crypto.randomUUID(),
                name: `schema_${nextSchemaNumber}`,
                sequences: [],
                tables: [],
            },
        ],
    };
}