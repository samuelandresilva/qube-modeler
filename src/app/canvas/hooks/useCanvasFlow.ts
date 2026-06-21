import type {
  Node as ReactFlowNode,
  NodeChange,
  OnNodeDrag,
  ReactFlowInstance,
} from "@xyflow/react";
import { applyNodeChanges, useEdgesState, useNodesState } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
import { updateTableNodePosition, type DatabaseProject } from "@/core/model";
import {
  mapProjectToFlow,
  mapProjectToFlowEdges,
} from "@/app/canvas/mappers/project-to-flow";

type Args = {
  project: DatabaseProject;
  setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
};

export function useCanvasFlow({
  project,
  setProject,
  selectedTableId,
  onSelectTable,
}: Args) {
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const initial = mapProjectToFlow(project);
  const [nodes, setNodes] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(
    () => setNodes(mapProjectToFlow(project).nodes),
    [project, setNodes],
  );
  useEffect(
    () => setEdges(mapProjectToFlowEdges(project, nodes)),
    [project, nodes, setEdges],
  );
  useEffect(
    () =>
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: node.id === selectedTableId,
        })),
      ),
    [selectedTableId, setNodes],
  );

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
    setProject((current) =>
      updateTableNodePosition(current, node.id, node.position),
    );
    onSelectTable(node.id);
  };

  const fitView = () =>
    instanceRef.current?.fitView({
      padding: 0.35,
      maxZoom: 0.85,
      duration: 300,
    });
  const focusTable = (tableId: string) => {
    if (!project.diagram.tableNodes.some((node) => node.tableId === tableId)) {
      setProject((current) =>
        updateTableNodePosition(current, tableId, { x: 160, y: 160 }),
      );
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
