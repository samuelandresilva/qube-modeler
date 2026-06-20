import type {
    DatabaseProject,
    DatabaseSchema,
    DatabaseTable,
} from "./database-project";

export function updateSchema(
    project: DatabaseProject,
    schemaId: string,
    updater: (schema: DatabaseSchema) => DatabaseSchema
): DatabaseProject {
    const currentSchema = project.schemas.find((schema) => schema.id === schemaId);

    if (!currentSchema) {
        return project;
    }

    const updatedSchema = updater(currentSchema);
    const schemaNameChanged = currentSchema.name !== updatedSchema.name;

    const projectWithUpdatedSchema = {
        ...project,
        schemas: project.schemas.map((schema) =>
            schema.id === schemaId ? updatedSchema : schema
        ),
    };

    if (!schemaNameChanged) {
        return projectWithUpdatedSchema;
    }

    return {
        ...projectWithUpdatedSchema,
        schemas: projectWithUpdatedSchema.schemas.map((schema) => ({
            ...schema,
            tables: schema.tables.map((table): DatabaseTable => ({
                ...table,
                foreignKeys: table.foreignKeys.map((foreignKey) => {
                    if (foreignKey.targetSchema !== currentSchema.name) {
                        return foreignKey;
                    }

                    return {
                        ...foreignKey,
                        targetSchema: updatedSchema.name,
                    };
                }),
            })),
        })),
    };
}