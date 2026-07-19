import type { Edge, Node } from "@xyflow/react";
import type { DatabaseProject } from "@/core/model";
import { generatePostgresColumnTypeSql } from "@/core/sql/postgres-column-type-sql";

export function mapProjectToFlow(
  project: DatabaseProject,
  onDoubleClickColumn?: (tableId: string, columnId: string) => void,
  currentEdges?: Edge[],
  onUpdateSubjectAreaDimensions?: (id: string, width: number, height: number) => void,
  onUpdateTextNoteContent?: (id: string, content: string) => void,
  onUpdateTextNoteDimensions?: (id: string, width: number, height: number) => void,
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
      parentId: table.subjectAreaId,
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

      const existingEdge = currentEdges?.find((e) => e.id === foreignKey.id);

      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: `${foreignKey.sourceColumns[0]}-source-right`,
        target: targetTableId,
        targetHandle: `${foreignKey.targetColumns[0]}-target-right`,
        label: `${foreignKey.sourceColumns[0]} → ${foreignKey.targetColumns[0]}`,
        animated: false,
        type: "smart",
        data: {
          ...existingEdge?.data,
        },
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

  const subjectAreaNodes: Node[] = (project.subjectAreas ?? []).map((area) => ({
    id: area.id,
    type: "subjectArea",
    position: area.position,
    style: { width: area.width, height: area.height },
    zIndex: -1,
    data: {
      id: area.id,
      label: area.name,
      color: area.color,
      width: area.width,
      height: area.height,
      onChangeDimensions: onUpdateSubjectAreaDimensions
        ? (width: number, height: number) => onUpdateSubjectAreaDimensions(area.id, width, height)
        : undefined,
    },
  }));

  const textNoteNodes: Node[] = (project.textNotes ?? []).map((note) => ({
    id: note.id,
    type: "textNote",
    position: note.position,
    style: { width: note.width, height: note.height },
    data: {
      id: note.id,
      content: note.content,
      color: note.color,
      width: note.width,
      height: note.height,
      onChangeContent: onUpdateTextNoteContent
        ? (content: string) => onUpdateTextNoteContent(note.id, content)
        : undefined,
      onChangeDimensions: onUpdateTextNoteDimensions
        ? (width: number, height: number) => onUpdateTextNoteDimensions(note.id, width, height)
        : undefined,
    },
  }));

  return {
    nodes: [...nodes, ...viewNodes, ...subjectAreaNodes, ...textNoteNodes],
    edges,
  };
}

export function mapProjectToFlowEdges(
  project: DatabaseProject,
  currentEdges?: Edge[],
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

      const existingEdge = currentEdges?.find((e) => e.id === foreignKey.id);

      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: `${foreignKey.sourceColumns[0]}-source-right`,
        target: targetTableId,
        targetHandle: `${foreignKey.targetColumns[0]}-target-right`,
        label: `${foreignKey.sourceColumns[0]} → ${foreignKey.targetColumns[0]}`,
        animated: false,
        type: "smart",
        data: {
          ...existingEdge?.data,
        },
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
