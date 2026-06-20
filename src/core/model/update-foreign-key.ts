import type { DatabaseForeignKey, DatabaseProject } from "./database-project";

export function updateForeignKey(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    foreignKeyId: string,
    updater: (foreignKey: DatabaseForeignKey) => DatabaseForeignKey
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
                        foreignKeys: table.foreignKeys.map((foreignKey) => {
                            if (foreignKey.id !== foreignKeyId) {
                                return foreignKey;
                            }

                            return updater(foreignKey);
                        }),
                    };
                }),
            };
        }),
    };
}