import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import { downloadFile } from "../download-file";
import { DatabaseTableNode } from "./DatabaseTableNode";
import {
    mapProjectToFlow,
    mapProjectToFlowEdges,
} from "./mapProjectToFlow";
import {
    createEmptyProject,
    updateTableNodePosition,
} from "../../core/model";
import { useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";
import "./Canvas.css";

const nodeTypes = {
    databaseTable: DatabaseTableNode,
};

const initialProject = createEmptyProject();

export function Canvas() {
    const [project, setProject] = useState(initialProject);
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

    const handleDownloadJson = () => {
        const json = JSON.stringify(project, null, 2);

        downloadFile("canvas-project.json", json, "application/json");
    };

    return (
        <div className="canvas-page">
            <button className="canvas-download-button" onClick={handleDownloadJson}>
                Download JSON
            </button>
            <ReactFlow
                className="canvas-flow"
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeDragStop={handleNodeDragStop}
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
    );
}