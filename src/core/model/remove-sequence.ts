import type { DatabaseProject } from "./database-project";

export function removeSequence(
    project: DatabaseProject,
    schemaId: string,
    sequenceId: string
): DatabaseProject {
    return {
        ...project,
        schemas: project.schemas.map((schema) => {
            if (schema.id !== schemaId) {
                return schema;
            }

            const sequenceToRemove = schema.sequences.find(
                (sequence) => sequence.id === sequenceId
            );

            if (!sequenceToRemove) {
                return schema;
            }

            return {
                ...schema,
                sequences: schema.sequences.filter(
                    (sequence) => sequence.id !== sequenceId
                ),
                tables: schema.tables.map((table) => ({
                    ...table,
                    columns: table.columns.map((column) => {
                        if (column.sequenceName !== sequenceToRemove.name) {
                            return column;
                        }

                        return {
                            ...column,
                            sequenceName: undefined,
                        };
                    }),
                })),
            };
        }),
    };
}