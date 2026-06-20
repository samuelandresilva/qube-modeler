import type {
    DatabaseProject,
    DatabaseUniqueConstraint,
} from "./database-project";

export function addUniqueConstraint(
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

                    const nextUniqueNumber = table.uniqueConstraints.length + 1;

                    const uniqueConstraint: DatabaseUniqueConstraint = {
                        id: crypto.randomUUID(),
                        name: `uk_${table.name}_${nextUniqueNumber}`,
                        columns: [],
                    };

                    return {
                        ...table,
                        uniqueConstraints: [
                            ...table.uniqueConstraints,
                            uniqueConstraint,
                        ],
                    };
                }),
            };
        }),
    };
}