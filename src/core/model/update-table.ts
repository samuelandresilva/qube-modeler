import type {
    DatabaseProject,
    DatabaseSchema,
    DatabaseTable,
} from "./database-project";
import { updateSchema } from "./update-schema";

export function updateTable(
    project: DatabaseProject,
    schemaId: string,
    tableId: string,
    updater: (table: DatabaseTable) => DatabaseTable
): DatabaseProject {
    const sourceSchema = project.schemas.find((schema) => schema.id === schemaId);
    const currentTable = sourceSchema?.tables.find((table) => table.id === tableId);

    if (!sourceSchema || !currentTable) {
        return project;
    }

    const updatedTable = updater(currentTable);
    const tableNameChanged = currentTable.name !== updatedTable.name;

    const projectWithUpdatedTable = updateSchema(
        project,
        schemaId,
        (schema: DatabaseSchema) => ({
            ...schema,
            tables: schema.tables.map((table) =>
                table.id === tableId ? updatedTable : table
            ),
        })
    );

    if (!tableNameChanged) {
        return projectWithUpdatedTable;
    }

    return {
        ...projectWithUpdatedTable,
        schemas: projectWithUpdatedTable.schemas.map((schema) => ({
            ...schema,
            tables: schema.tables.map((table): DatabaseTable => ({
                ...table,
                foreignKeys: table.foreignKeys.map((foreignKey) => {
                    const pointsToRenamedTable =
                        foreignKey.targetSchema === sourceSchema.name &&
                        foreignKey.targetTable === currentTable.name;

                    if (!pointsToRenamedTable) {
                        return foreignKey;
                    }

                    return {
                        ...foreignKey,
                        targetTable: updatedTable.name,
                    };
                }),
            })),
        })),
    };
}