import type { DatabaseProject, DatabaseTable } from "./database-project";

export function removeSchema(
    project: DatabaseProject,
    schemaId: string
): DatabaseProject {
    const schemaToRemove = project.schemas.find((schema) => schema.id === schemaId);

    if (!schemaToRemove) {
        return project;
    }

    return {
        ...project,
        schemas: project.schemas
            .filter((schema) => schema.id !== schemaId)
            .map((schema) => ({
                ...schema,
                tables: schema.tables.map((table): DatabaseTable => ({
                    ...table,
                    foreignKeys: table.foreignKeys.filter((foreignKey) => {
                        const pointsToRemovedSchema =
                            foreignKey.targetSchema === schemaToRemove.name;

                        return !pointsToRemovedSchema;
                    }),
                })),
            })),
    };
}