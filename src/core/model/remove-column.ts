import type { DatabaseProject, DatabaseTable } from "./database-project";

export function removeColumn(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    columnId: string
): DatabaseProject {
    const sourceSchema = project.schemas.find((schema) => schema.id === schemaId);
    const sourceTable = sourceSchema?.tables.find((table) => table.id === tableId);
    const columnToRemove = sourceTable?.columns.find(
        (column) => column.id === columnId
    );

    if (!sourceSchema || !sourceTable || !columnToRemove) {
        return project;
    }

    return {
        ...project,
        schemas: project.schemas.map((schema) => ({
            ...schema,
            tables: schema.tables.map((table): DatabaseTable => {
                const isSourceTable =
                    schema.id === schemaId && table.id === tableId;

                const columns = isSourceTable
                    ? table.columns.filter((column) => column.id !== columnId)
                    : table.columns;

                return {
                    ...table,
                    columns,
                    uniqueConstraints: table.uniqueConstraints.filter(
                        (uniqueConstraint) =>
                            !uniqueConstraint.columns.includes(columnToRemove.name)
                    ),
                    indexes: table.indexes.filter(
                        (index) => !index.columns.includes(columnToRemove.name)
                    ),
                    foreignKeys: table.foreignKeys.filter((foreignKey) => {
                        const usesRemovedColumnAsSource =
                            isSourceTable &&
                            foreignKey.sourceColumns.includes(columnToRemove.name);

                        const usesRemovedColumnAsTarget =
                            foreignKey.targetSchema === sourceSchema.name &&
                            foreignKey.targetTable === sourceTable.name &&
                            foreignKey.targetColumns.includes(columnToRemove.name);

                        return !usesRemovedColumnAsSource && !usesRemovedColumnAsTarget;
                    }),
                };
            }),
        })),
    };
}