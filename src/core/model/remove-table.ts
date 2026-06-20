import type { DatabaseProject, DatabaseTable } from "./database-project";

export function removeTable(
    project: DatabaseProject,
    schemaId: string,
    tableId: string
): DatabaseProject {
    const sourceSchema = project.schemas.find((schema) => schema.id === schemaId);
    const tableToRemove = sourceSchema?.tables.find((table) => table.id === tableId);

    if (!sourceSchema || !tableToRemove) {
        return project;
    }

    return {
        ...project,
        schemas: project.schemas.map((schema) => ({
            ...schema,
            tables: schema.tables
                .filter((table) => !(schema.id === schemaId && table.id === tableId))
                .map((table): DatabaseTable => ({
                    ...table,
                    foreignKeys: table.foreignKeys.filter((foreignKey) => {
                        const pointsToRemovedTable =
                            foreignKey.targetSchema === sourceSchema.name &&
                            foreignKey.targetTable === tableToRemove.name;

                        return !pointsToRemovedTable;
                    }),
                })),
        })),
    };
}