import type { DatabaseProject } from "./database-project";

export function addTable(
    project: DatabaseProject,
    schemaId: string
): DatabaseProject {
    return {
        ...project,
        schemas: project.schemas.map((schema) => {
            if (schema.id !== schemaId) {
                return schema;
            }

            const nextTableNumber = schema.tables.length + 1;

            return {
                ...schema,
                tables: [
                    ...schema.tables,
                    {
                        id: crypto.randomUUID(),
                        name: `table_${nextTableNumber}`,
                        columns: [],
                        foreignKeys: [],
                        uniqueConstraints: [],
                        indexes: [],
                    },
                ],
            };
        }),
    };
}