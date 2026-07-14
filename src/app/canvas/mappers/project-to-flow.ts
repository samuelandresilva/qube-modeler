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
      const targetTableId = findTableIdByName(
        project,
        foreignKey.targetSchema,
        foreignKey.targetTable,
      );

      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: `${foreignKey.sourceColumns[0]}-source-right`,
        target: targetTableId,
        targetHandle: `${foreignKey.targetColumns[0]}-target-right`,
        label: `${foreignKey.sourceColumns[0]} → ${foreignKey.targetColumns[0]}`,
        animated: false,
        type: "smart",
      };
    }),
  );

  const viewNodes: Node[] = (project.views ?? []).map((view, index) => {
    const schema = project.schemas.find((s) => s.id === view.schemaId);
    return {
      id: view.id,
      type: "databaseView",
      position: {
        x: view.x ?? (120 + index * 360),
        y: view.y ?? 240,
      },
      data: {
        viewId: view.id,
        viewName: view.name,
        schemaName: schema?.name ?? "public",
        definition: view.definition ?? "",
        isMaterialized: view.isMaterialized,
        triggerCount: view.triggers?.length ?? 0,
        triggersCount: view.triggers?.length ?? 0,
      },
    };
  });

  return {
    nodes: [...nodes, ...viewNodes],
    edges,
  };
}

export function mapProjectToFlowEdges(
  project: DatabaseProject,
): Edge[] {
  const tables = project.schemas.flatMap((schema) =>
    schema.tables.map((table) => ({
      schema,
      table,
    })),
  );

  return tables.flatMap(({ table }) =>
    table.foreignKeys.map((foreignKey) => {
      const targetTableId = findTableIdByName(
        project,
        foreignKey.targetSchema,
        foreignKey.targetTable,
      );

      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: `${foreignKey.sourceColumns[0]}-source-right`,
        target: targetTableId,
        targetHandle: `${foreignKey.targetColumns[0]}-target-right`,
        label: `${foreignKey.sourceColumns[0]} → ${foreignKey.targetColumns[0]}`,
        animated: false,
        type: "smart",
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
