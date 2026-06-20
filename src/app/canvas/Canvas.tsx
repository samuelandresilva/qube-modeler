import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    type ReactFlowInstance
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useRef, useState } from "react";
import type { DatabaseProject } from "../../core/model";
import {
    updateTableNodePosition
} from "../../core/model";
import "./Canvas.css";
import { CanvasInspector } from "./CanvasInspector";
import { CanvasToolbar } from "./CanvasToolbar";
import { DatabaseTableNode } from "./DatabaseTableNode";
import {
    mapProjectToFlow,
    mapProjectToFlowEdges,
} from "./mapProjectToFlow";

type CanvasProps = {
    project: DatabaseProject;
    setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
};

const nodeTypes = {
    databaseTable: DatabaseTableNode,
};

export function Canvas({ project, setProject }: CanvasProps) {
    return (
        <ReactFlowProvider>
            <CanvasContent project={project} setProject={setProject} />
        </ReactFlowProvider>
    );
}

function CanvasContent({ project, setProject }: CanvasProps) {
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

    const handleFitView = () => {
        reactFlowInstanceRef.current?.fitView({
            padding: 0.2,
            duration: 300,
        });
    };

    const [nodes, , onNodesChange] = useNodesState(
        mapProjectToFlow(project).nodes
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(
        mapProjectToFlow(project).edges
    );

    useEffect(() => {
        setEdges(mapProjectToFlowEdges(project, nodes));
    }, [project, nodes, setEdges]);

    const handleNodeDragStop = (
        _: unknown,
        node: { id: string; position: { x: number; y: number } }
    ) => {
        setProject((currentProject) =>
            updateTableNodePosition(currentProject, node.id, {
                x: node.position.x,
                y: node.position.y,
            })
        );
    };

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const selectedTable = project.schemas
        .flatMap((schema) => schema.tables)
        .find((table) => table.id === selectedTableId);

    return (
        <ReactFlowProvider>
            <div className="canvas-page">
                <CanvasToolbar onFitView={handleFitView} />
                {selectedTable && (
                    <CanvasInspector
                        table={selectedTable}
                        onClose={() => setSelectedTableId(null)}
                    />
                )}
                <ReactFlow
                    className="canvas-flow"
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodeDragStop={handleNodeDragStop}
                    onNodeClick={(_, node) => setSelectedTableId(node.id)}
                    onPaneClick={() => setSelectedTableId(null)}
                    onInit={(instance) => {
                        reactFlowInstanceRef.current = instance;
                    }}
                    defaultEdgeOptions={{
                        type: "smoothstep",
                        style: {
                            stroke: "#38bdf8",
                            strokeWidth: 2,
                        },
                        labelStyle: {
                            fill: "#cbd5e1",
                            fontSize: 12,
                            fontWeight: 600,
                        },
                        labelBgStyle: {
                            fill: "#020617",
                            fillOpacity: 0.9,
                        },
                    }}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodesConnectable={false}
                    elementsSelectable
                    fitView
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </ReactFlowProvider>
    );
}