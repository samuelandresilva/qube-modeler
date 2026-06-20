import type { DatabaseProject, DatabaseSequence } from "./database-project";

export function updateSequence(
    project: DatabaseProject,
    schemaId: string,
    sequenceId: string,
    updater: (sequence: DatabaseSequence) => DatabaseSequence
): DatabaseProject {
    return {
        ...project,
        schemas: project.schemas.map((schema) => {
            if (schema.id !== schemaId) {
                return schema;
            }

            const currentSequence = schema.sequences.find(
                (sequence) => sequence.id === sequenceId
            );

            if (!currentSequence) {
                return schema;
            }

            const updatedSequence = updater(currentSequence);
            const sequenceNameChanged = currentSequence.name !== updatedSequence.name;

            return {
                ...schema,
                sequences: schema.sequences.map((sequence) => {
                    if (sequence.id !== sequenceId) {
                        return sequence;
                    }

                    return updatedSequence;
                }),
                tables: sequenceNameChanged
                    ? schema.tables.map((table) => ({
                        ...table,
                        columns: table.columns.map((column) => {
                            if (column.sequenceName !== currentSequence.name) {
                                return column;
                            }

                            return {
                                ...column,
                                sequenceName: updatedSequence.name,
                            };
                        }),
                    }))
                    : schema.tables,
            };
        }),
    };
}