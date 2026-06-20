import type {
    DatabaseColumn,
    DatabaseProject,
    DatabaseTable,
} from "./database-project";

export function updateColumn(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    columnId: string,
    updater: (column: DatabaseColumn) => DatabaseColumn
): DatabaseProject {
    const sourceSchema = project.schemas.find((schema) => schema.id === schemaId);
    const sourceTable = sourceSchema?.tables.find((table) => table.id === tableId);
    const currentColumn = sourceTable?.columns.find(
        (column) => column.id === columnId
    );

    if (!sourceSchema || !sourceTable || !currentColumn) {
        return project;
    }

    const updatedColumn = updater(currentColumn);
    const columnNameChanged = currentColumn.name !== updatedColumn.name;

    return {
        ...project,
        schemas: project.schemas.map((schema) => ({
            ...schema,
            tables: schema.tables.map((table): DatabaseTable => {
                const isEditedTable =
                    schema.id === schemaId && table.id === tableId;

                const columns = isEditedTable
                    ? table.columns.map((column) =>
                        column.id === columnId ? updatedColumn : column
                    )
                    : table.columns;

                if (!columnNameChanged) {
                    return {
                        ...table,
                        columns,
                    };
                }

                return {
                    ...table,
                    columns,

                    uniqueConstraints: table.uniqueConstraints.map(
                        (uniqueConstraint) => ({
                            ...uniqueConstraint,
                            columns: uniqueConstraint.columns.map(
                                (uniqueColumn) =>
                                    isEditedTable &&
                                        uniqueColumn === currentColumn.name
                                        ? updatedColumn.name
                                        : uniqueColumn
                            ),
                        })
                    ),

                    indexes: table.indexes.map((index) => ({
                        ...index,
                        columns: index.columns.map((indexColumn) =>
                            isEditedTable && indexColumn === currentColumn.name
                                ? updatedColumn.name
                                : indexColumn
                        ),
                    })),

                    foreignKeys: table.foreignKeys.map((foreignKey) => {
                        const isForeignKeyFromEditedTable =
                            schema.id === schemaId && table.id === tableId;

                        const pointsToEditedTable =
                            foreignKey.targetSchema === sourceSchema.name &&
                            foreignKey.targetTable === sourceTable.name;

                        return {
                            ...foreignKey,
                            sourceColumns: isForeignKeyFromEditedTable
                                ? foreignKey.sourceColumns.map((sourceColumn) =>
                                    sourceColumn === currentColumn.name
                                        ? updatedColumn.name
                                        : sourceColumn
                                )
                                : foreignKey.sourceColumns,
                            targetColumns: pointsToEditedTable
                                ? foreignKey.targetColumns.map((targetColumn) =>
                                    targetColumn === currentColumn.name
                                        ? updatedColumn.name
                                        : targetColumn
                                )
                                : foreignKey.targetColumns,
                        };
                    }),
                };
            }),
        })),
    };
}