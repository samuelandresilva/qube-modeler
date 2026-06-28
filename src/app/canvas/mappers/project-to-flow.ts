import type { Edge, Node } from "@xyflow/react";
import type { DatabaseProject } from "@/core/model";
import { generatePostgresColumnTypeSql } from "@/core/sql/postgres-column-type-sql";

export function mapProjectToFlow(
  project: DatabaseProject,
  onDoubleClickColumn?: (tableId: string, columnId: string) => void,
): {
  nodes: Node[];
  edges: Edge[];
} {
  const tables = project.schemas.flatMap((schema) =>
    schema.tables.map((table) => ({
      schema,
      table,
    })),
  );

  const nodes: Node[] = tables.map(({ schema, table }, index) => {
    const tableNode = project.diagram.tableNodes.find(
      (currentTableNode) => currentTableNode.tableId === table.id,
    );

    return {
      id: table.id,
      type: "databaseTable",
      position: tableNode?.position ?? {
        x: 120 + index * 360,
        y: 120,
      },
      data: {
        tableName: table.name,
        schemaName: schema.name,
        onDoubleClickColumn: onDoubleClickColumn
          ? (columnId: string) => onDoubleClickColumn(table.id, columnId)
          : undefined,
        columns: table.columns.map((column) => ({
          id: column.id,
          name: column.name,
          type: generatePostgresColumnTypeSql(column),
          primaryKey: column.primaryKey,
          nullable: column.nullable,
        })),
      },
    };
  });

  const edges: Edge[] = tables.flatMap(({ table }) =>
    table.foreignKeys.map((foreignKey) => {
      const sourceTableNode = project.diagram.tableNodes.find(
        (tableNode) => tableNode.tableId === table.id,
      );

      const targetTableId = findTableIdByName(
        project,
        foreignKey.targetSchema,
        foreignKey.targetTable,
      );

      const targetTableNode = project.diagram.tableNodes.find(
        (tableNode) => tableNode.tableId === targetTableId,
      );

      const sourceIsLeftOfTarget =
        (sourceTableNode?.position.x ?? 0) <=
        (targetTableNode?.position.x ?? 0);

      const sourceSide = sourceIsLeftOfTarget ? "right" : "left";
      const targetSide = sourceIsLeftOfTarget ? "left" : "right";

      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: `${foreignKey.sourceColumns[0]}-source-${sourceSide}`,
        target: targetTableId,
        targetHandle: `${foreignKey.targetColumns[0]}-target-${targetSide}`,
        label: `${foreignKey.sourceColumns[0]} → ${foreignKey.targetColumns[0]}`,
        animated: false,
      };
    }),
  );

  return {
    nodes,
    edges,
  };
}

export function mapProjectToFlowEdges(
  project: DatabaseProject,
  nodes: Node[],
): Edge[] {
  const tables = project.schemas.flatMap((schema) =>
    schema.tables.map((table) => ({
      schema,
      table,
    })),
  );

  return tables.flatMap(({ table }) =>
    table.foreignKeys.map((foreignKey) => {
      const sourceNode = nodes.find((node) => node.id === table.id);

      const targetTableId = findTableIdByName(
        project,
        foreignKey.targetSchema,
        foreignKey.targetTable,
      );

      const targetNode = nodes.find((node) => node.id === targetTableId);

      const sourceIsLeftOfTarget =
        (sourceNode?.position.x ?? 0) <= (targetNode?.position.x ?? 0);

      const sourceSide = sourceIsLeftOfTarget ? "right" : "left";
      const targetSide = sourceIsLeftOfTarget ? "left" : "right";

      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: `${foreignKey.sourceColumns[0]}-source-${sourceSide}`,
        target: targetTableId,
        targetHandle: `${foreignKey.targetColumns[0]}-target-${targetSide}`,
        label: `${foreignKey.sourceColumns[0]} → ${foreignKey.targetColumns[0]}`,
        animated: false,
      };
    }),
  );
}

function findTableIdByName(
  project: DatabaseProject,
  schemaName: string,
  tableName: string,
): string {
  const schema = project.schemas.find(
    (currentSchema) => currentSchema.name === schemaName,
  );

  const table = schema?.tables.find(
    (currentTable) => currentTable.name === tableName,
  );

  return table?.id ?? "";
}
