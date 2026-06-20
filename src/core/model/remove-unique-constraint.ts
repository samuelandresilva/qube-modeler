import type { DatabaseProject } from "./database-project";

export function removeUniqueConstraint(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    uniqueConstraintId: string
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
                        uniqueConstraints: table.uniqueConstraints.filter(
                            (uniqueConstraint) =>
                                uniqueConstraint.id !== uniqueConstraintId
                        ),
                    };
                }),
            };
        }),
    };
}