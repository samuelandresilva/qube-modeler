import type { Node } from "@xyflow/react";
import type { DatabaseDiagram } from "../../core/diagram";

export function mapFlowToDiagram(nodes: Node[]): DatabaseDiagram {
    return {
        tableNodes: nodes.map((node) => ({
            tableId: node.id,
            position: {
                x: node.position.x,
                y: node.position.y,
            },
        })),
    };
}