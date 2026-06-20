import type { DatabaseProject } from "./database-project";

export function removeIndex(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    indexId: string
): DatabaseProject {
    return {
        ...project,
        schemas: project.schemas.map((schema) => {
            if (schema.id !== schemaId) {
                return schema;
            }

            return {
                ...schema,
                tables: schema.tables.map((table) => {
                    if (table.id !== tableId) {
                        return table;
                    }

                    return {
                        ...table,
                        indexes: table.indexes.filter(
                            (index) => index.id !== indexId
                        ),
                    };
                }),
            };
        }),
    };
}