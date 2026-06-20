import type {
    DatabaseProject,
    DatabaseUniqueConstraint,
} from "./database-project";

export function updateUniqueConstraint(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    uniqueConstraintId: string,
    updater: (
        uniqueConstraint: DatabaseUniqueConstraint
    ) => DatabaseUniqueConstraint
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
                        uniqueConstraints: table.uniqueConstraints.map(
                            (uniqueConstraint) => {
                                if (uniqueConstraint.id !== uniqueConstraintId) {
                                    return uniqueConstraint;
                                }

                                return updater(uniqueConstraint);
                            }
                        ),
                    };
                }),
            };
        }),
    };
}