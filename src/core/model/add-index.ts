import type {
    DatabaseIndex,
    DatabaseProject,
} from "./database-project";

export function addIndex(
    project: DatabaseProject,
    schemaId: string,
    tableId: string
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

                    const nextIndexNumber = table.indexes.length + 1;

                    const index: DatabaseIndex = {
                        id: crypto.randomUUID(),
                        name: `idx_${table.name}_${nextIndexNumber}`,
                        columns: [],
                    };

                    return {
                        ...table,
                        indexes: [...table.indexes, index],
                    };
                }),
            };
        }),
    };
}