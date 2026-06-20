import type {
    DatabaseIndex,
    DatabaseProject,
} from "./database-project";

export function updateIndex(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    indexId: string,
    updater: (index: DatabaseIndex) => DatabaseIndex
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
                        indexes: table.indexes.map((index) => {
                            if (index.id !== indexId) {
                                return index;
                            }

                            return updater(index);
                        }),
                    };
                }),
            };
        }),
    };
}