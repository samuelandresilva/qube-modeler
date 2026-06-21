export interface DatabaseDiagram {
  tableNodes: DatabaseTableDiagramNode[];
}

export interface DatabaseTableDiagramNode {
  tableId: string;
  position: DiagramPosition;
}

export interface DiagramPosition {
  x: number;
  y: number;
}
