import type { DatabaseProject } from "./database-project";

export function addColumn(
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

                    const nextColumnNumber = table.columns.length + 1;

                    return {
                        ...table,
                        columns: [
                            ...table.columns,
                            {
                                id: crypto.randomUUID(),
                                name: `column_${nextColumnNumber}`,
                                type: "varchar(255)",
                                nullable: true,
                                primaryKey: false,
                            },
                        ],
                    };
                }),
            };
        }),
    };
}