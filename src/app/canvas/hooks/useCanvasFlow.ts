import type {
  Node as ReactFlowNode,
  NodeChange,
  OnNodeDrag,
  ReactFlowInstance,
  Edge,
} from "@xyflow/react";
import { applyNodeChanges, useEdgesState, useNodesState } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
import { updateTableNodePosition, updateDatabaseView, type DatabaseProject } from "@/core/model";
import {
  mapProjectToFlow,
} from "@/app/canvas/mappers/project-to-flow";

type Args = {
  project: DatabaseProject;
  setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
  onDoubleClickColumn?: (tableId: string, columnId: string) => void;
};

export function useCanvasFlow({
  project,
  setProject,
  selectedTableId,
  onSelectTable,
  onDoubleClickColumn,
}: Args) {
  const instanceRef = useRef<ReactFlowInstance<ReactFlowNode> | null>(null);
  const [nodes, setNodes] = useNodesState<ReactFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const flow = mapProjectToFlow(project, onDoubleClickColumn);
    setNodes(
      flow.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedTableId,
      })),
    );
    setEdges(flow.edges);
  }, [project, selectedTableId, setEdges, setNodes, onDoubleClickColumn]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) =>
        applyNodeChanges(changes, current).map((node) => ({
          ...node,
          selected: node.id === selectedTableId,
        })),
      );
    },
    [selectedTableId, setNodes],
  );

  const onNodeDragStop: OnNodeDrag<ReactFlowNode> = (_event, node) => {
    if (node.type === "databaseView") {
      setProject((current) =>
        updateDatabaseView(current, node.id, (view) => ({
          ...view,
          x: node.position.x,
          y: node.position.y,
        })),
      );
    } else {
      setProject((current) =>
        updateTableNodePosition(current, node.id, node.position),
      );
    }
    onSelectTable(node.id);
  };

  const fitView = () =>
    instanceRef.current?.fitView({
      padding: 0.35,
      maxZoom: 0.85,
      duration: 300,
    });
  const focusTable = (tableId: string) => {
    const isView = (project.views ?? []).some((v) => v.id === tableId);
    if (!isView) {
      if (!project.diagram.tableNodes.some((node) => node.tableId === tableId)) {
        setProject((current) =>
          updateTableNodePosition(current, tableId, { x: 160, y: 160 }),
        );
      }
    }
    onSelectTable(tableId);
    requestAnimationFrame(() =>
      instanceRef.current?.fitView({
        nodes: [{ id: tableId }],
        padding: 0.55,
        maxZoom: 0.95,
        duration: 300,
      }),
    );
  };

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    fitView,
    focusTable,
    onInit: (instance: ReactFlowInstance) => {
      instanceRef.current = instance;
    },
  };
}
