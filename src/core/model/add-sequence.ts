import type { DatabaseProject } from "./database-project";

export function addSequence(
    project: DatabaseProject,
    schemaId: string
): DatabaseProject {
    return {
        ...project,
        schemas: project.schemas.map((schema) => {
            if (schema.id !== schemaId) {
                return schema;
            }

            const nextSequenceNumber = schema.sequences.length + 1;

            return {
                ...schema,
                sequences: [
                    ...schema.sequences,
                    {
                        id: crypto.randomUUID(),
                        name: `sequence_${nextSequenceNumber}`,
                        startWith: 1,
                        incrementBy: 1,
                    },
                ],
            };
        }),
    };
}