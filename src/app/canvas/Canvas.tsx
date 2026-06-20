import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useState } from "react";
import type { DatabaseProject } from "../../core/model";
import {
    updateTableNodePosition
} from "../../core/model";
import "./Canvas.css";
import { DatabaseTableNode } from "./DatabaseTableNode";
import {
    mapProjectToFlow,
    mapProjectToFlowEdges,
} from "./mapProjectToFlow";
import { generatePostgresColumnTypeSql } from "../../core/sql";

type CanvasProps = {
    project: DatabaseProject;
    setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
};

const nodeTypes = {
    databaseTable: DatabaseTableNode,
};

export function Canvas({ project, setProject }: CanvasProps) {
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
        <div className="canvas-page">
            {selectedTable && (
                <aside className="canvas-inspector">
                    <div className="canvas-inspector__header">
                        <span>Table</span>
                        <button onClick={() => setSelectedTableId(null)}>×</button>
                    </div>

                    <strong>{selectedTable.name}</strong>

                    <p>
                        {selectedTable.columns.length} columns ·{" "}
                        {selectedTable.foreignKeys.length} foreign keys
                    </p>

                    <div className="canvas-inspector__section">
                        <span className="canvas-inspector__section-title">Columns</span>

                        <div className="canvas-inspector__columns">
                            {selectedTable.columns.map((column) => (
                                <div className="canvas-inspector__column" key={column.id}>
                                    <span>
                                        {column.primaryKey ? "🔑 " : ""}
                                        {column.name}
                                    </span>

                                    <small>{generatePostgresColumnTypeSql(column)}</small>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="canvas-inspector__section">
                        <span className="canvas-inspector__section-title">Foreign keys</span>

                        <div className="canvas-inspector__columns">
                            {selectedTable.foreignKeys.length === 0 ? (
                                <p className="canvas-inspector__empty">No foreign keys.</p>
                            ) : (
                                selectedTable.foreignKeys.map((foreignKey) => (
                                    <div className="canvas-inspector__column" key={foreignKey.id}>
                                        <span>{foreignKey.name}</span>

                                        <small>
                                            {foreignKey.sourceColumns.join(", ")} →{" "}
                                            {foreignKey.targetTable}.
                                            {foreignKey.targetColumns.join(", ")}
                                        </small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="canvas-inspector__section">
                        <span className="canvas-inspector__section-title">Unique constraints</span>

                        <div className="canvas-inspector__columns">
                            {selectedTable.uniqueConstraints.length === 0 ? (
                                <p className="canvas-inspector__empty">No unique constraints.</p>
                            ) : (
                                selectedTable.uniqueConstraints.map((uniqueConstraint) => (
                                    <div
                                        className="canvas-inspector__column"
                                        key={uniqueConstraint.id}
                                    >
                                        <span>{uniqueConstraint.name}</span>

                                        <small>
                                            {uniqueConstraint.columns.join(", ")}
                                        </small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="canvas-inspector__section">
                        <span className="canvas-inspector__section-title">Indexes</span>

                        <div className="canvas-inspector__columns">
                            {selectedTable.indexes.length === 0 ? (
                                <p className="canvas-inspector__empty">No indexes.</p>
                            ) : (
                                selectedTable.indexes.map((index) => (
                                    <div className="canvas-inspector__column" key={index.id}>
                                        <span>{index.name}</span>

                                        <small>
                                            {index.columns.join(", ")}
                                        </small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </aside>
            )}
            <ReactFlow
                className="canvas-flow"
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeDragStop={handleNodeDragStop}
                onNodeClick={(_, node) => setSelectedTableId(node.id)}
                onPaneClick={() => setSelectedTableId(null)}
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