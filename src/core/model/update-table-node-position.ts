import type { DatabaseProject } from "./database-project";
import type { DiagramPosition } from "../diagram";

export function updateTableNodePosition(
    project: DatabaseProject,
    tableId: string,
    position: DiagramPosition
): DatabaseProject {
    const tableNodeExists = project.diagram.tableNodes.some(
        (tableNode) => tableNode.tableId === tableId
    );

    if (!tableNodeExists) {
        return {
            ...project,
            diagram: {
                ...project.diagram,
                tableNodes: [
                    ...project.diagram.tableNodes,
                    {
                        tableId,
                        position,
                    },
                ],
            },
        };
    }

    return {
        ...project,
        diagram: {
            ...project.diagram,
            tableNodes: project.diagram.tableNodes.map((tableNode) => {
                if (tableNode.tableId !== tableId) {
                    return tableNode;
                }

                return {
                    ...tableNode,
                    position,
                };
            }),
        },
    };
}