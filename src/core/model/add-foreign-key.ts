import type { DatabaseForeignKey, DatabaseProject } from "./database-project";

export function addForeignKey(
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

                    const nextForeignKeyNumber = table.foreignKeys.length + 1;

                    const foreignKey: DatabaseForeignKey = {
                        id: crypto.randomUUID(),
                        name: `fk_${table.name}_${nextForeignKeyNumber}`,
                        sourceColumns: [],
                        targetSchema: schema.name,
                        targetTable: "",
                        targetColumns: [],
                        onUpdate: "NO ACTION",
                        onDelete: "NO ACTION",
                    };

                    return {
                        ...table,
                        foreignKeys: [...table.foreignKeys, foreignKey],
                    };
                }),
            };
        }),
    };
}