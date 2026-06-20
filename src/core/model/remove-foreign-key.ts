import type { DatabaseProject } from "./database-project";

export function removeForeignKey(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    foreignKeyId: string
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
                        foreignKeys: table.foreignKeys.filter(
                            (foreignKey) => foreignKey.id !== foreignKeyId
                        ),
                    };
                }),
            };
        }),
    };
}