import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";

import { DatabaseTableNode } from "./DatabaseTableNode";
import {
    mapProjectToFlow,
    mapProjectToFlowEdges,
} from "./mapProjectToFlow";
import { createEmptyProject } from "../../core/model";
import { useEffect } from "react";

import "@xyflow/react/dist/style.css";
import "./Canvas.css";

const nodeTypes = {
    databaseTable: DatabaseTableNode,
};

const initialProject = createEmptyProject();
const initialFlow = mapProjectToFlow(initialProject);

export function Canvas() {
    const [nodes, , onNodesChange] = useNodesState(initialFlow.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);

    useEffect(() => {
        setEdges(mapProjectToFlowEdges(initialProject, nodes));
    }, [nodes, setEdges]);

    return (
        <div className="canvas-page">
            <ReactFlow
                className="canvas-flow"
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
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