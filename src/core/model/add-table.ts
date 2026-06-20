import type { DatabaseProject, DatabaseTable } from "./database-project";

export function addTable(
    project: DatabaseProject,
    schemaId: string
): DatabaseProject {
    const schema = project.schemas.find(
        (currentSchema) => currentSchema.id === schemaId
    );

    if (!schema) {
        return project;
    }

    const nextTableNumber = schema.tables.length + 1;

    const newTable: DatabaseTable = {
        id: crypto.randomUUID(),
        name: `table_${nextTableNumber}`,
        columns: [],
        foreignKeys: [],
        uniqueConstraints: [],
        indexes: [],
    };

    return {
        ...project,
        schemas: project.schemas.map((currentSchema) => {
            if (currentSchema.id !== schemaId) {
                return currentSchema;
            }

            return {
                ...currentSchema,
                tables: [...currentSchema.tables, newTable],
            };
        }),
        diagram: {
            ...project.diagram,
            tableNodes: [
                ...project.diagram.tableNodes,
                {
                    tableId: newTable.id,
                    position: {
                        x: 120 + project.diagram.tableNodes.length * 40,
                        y: 120 + project.diagram.tableNodes.length * 40,
                    },
                },
            ],
        },
    };
}