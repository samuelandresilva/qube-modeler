import type { DiagramPosition } from "@/core/diagram";
import type { DatabaseProject } from "@/core/model/types";

export function updateTableNodePosition(
  project: DatabaseProject,
  tableId: string,
  position: DiagramPosition,
): DatabaseProject {
  const exists = project.diagram.tableNodes.some(
    (node) => node.tableId === tableId,
  );
  return {
    ...project,
    diagram: {
      ...project.diagram,
      tableNodes: exists
        ? project.diagram.tableNodes.map((node) =>
            node.tableId === tableId ? { ...node, position } : node,
          )
        : [...project.diagram.tableNodes, { tableId, position }],
    },
  };
}
