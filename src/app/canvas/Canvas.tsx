import {
    applyNodeChanges,
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
    addColumn,
    addForeignKey,
    addIndex,
    addTable,
    addUniqueConstraint,
    removeColumn,
    removeForeignKey,
    removeIndex,
    removeTable,
    removeUniqueConstraint,
    updateColumn,
    updateForeignKey,
    updateIndex,
    updateTable,
    updateTableNodePosition,
    updateUniqueConstraint
} from "../../core/model";
import { AddColumnModal } from "./AddColumnModal";
import { AddForeignKeyModal } from "./AddForeignKeyModal";
import "./Canvas.css";
import { CanvasInspector } from "./CanvasInspector";
import { CanvasToolbar } from "./CanvasToolbar";
import { DatabaseTableNode } from "./DatabaseTableNode";
import { EditColumnModal } from "./EditColumnModal";
import {
    mapProjectToFlow,
    mapProjectToFlowEdges,
} from "./mapProjectToFlow";
import { EditForeignKeyModal } from "./EditForeignKeyModal";
import { AddUniqueConstraintModal } from "./AddUniqueConstraintModal";
import { EditUniqueConstraintModal } from "./EditUniqueConstraintModal";
import { EditIndexModal } from "./EditIndexModal";
import { AddIndexModal } from "./AddIndexModal";

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
            padding: 0.35,
            maxZoom: 0.85,
            duration: 300,
        });
    };

    const [nodes, setNodes] = useNodesState(
        mapProjectToFlow(project).nodes
    );

    const [edges, setEdges, onEdgesChange] = useEdgesState(
        mapProjectToFlow(project).edges
    );

    useEffect(() => {
        setNodes(mapProjectToFlow(project).nodes);
    }, [project, setNodes]);

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

    const handleAddTable = () => {
        const firstSchema = project.schemas[0];

        if (!firstSchema) {
            return;
        }

        const currentTableIds = new Set(
            project.schemas.flatMap((schema) =>
                schema.tables.map((table) => table.id)
            )
        );

        const nextProject = addTable(project, firstSchema.id);

        const newTable = nextProject.schemas
            .flatMap((schema) => schema.tables)
            .find((table) => !currentTableIds.has(table.id));

        setProject(nextProject);

        if (newTable) {
            setSelectedTableId(newTable.id);
        }

        window.requestAnimationFrame(() => {
            reactFlowInstanceRef.current?.fitView({
                padding: 0.2,
                duration: 300,
            });
        });
    };

    const handleDeleteTable = () => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            removeTable(currentProject, schema.id, selectedTableId)
        );

        setSelectedTableId(null);
        setEditingColumnId(null);
    };

    const handleNodesChange = (changes: Parameters<typeof applyNodeChanges>[0]) => {
        setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    };

    const handleRenameTable = (name: string) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            updateTable(
                currentProject,
                schema.id,
                selectedTableId,
                (currentTable) => ({
                    ...currentTable,
                    name,
                })
            )
        );
    };

    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const handleAddColumn = () => {
        setIsAddColumnModalOpen(true);
    };
    const handleCreateColumn = (columnData: {
        name: string;
        type: string;
        size?: number;
        scale?: number;
        nullable: boolean;
        primaryKey: boolean;
    }) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        const currentColumnIds = new Set(
            schema.tables
                .find((table) => table.id === selectedTableId)
                ?.columns.map((column) => column.id) ?? []
        );

        const projectWithColumn = addColumn(project, schema.id, selectedTableId);

        const newColumn = projectWithColumn.schemas
            .flatMap((currentSchema) => currentSchema.tables)
            .find((table) => table.id === selectedTableId)
            ?.columns.find((column) => !currentColumnIds.has(column.id));

        if (!newColumn) {
            return;
        }

        const nextProject = updateColumn(
            projectWithColumn,
            schema.id,
            selectedTableId,
            newColumn.id,
            (currentColumn) => ({
                ...currentColumn,
                name: columnData.name,
                type: columnData.type,
                size: columnData.size,
                scale: columnData.scale,
                nullable: columnData.nullable,
                primaryKey: columnData.primaryKey,
            })
        );

        setProject(nextProject);
        setIsAddColumnModalOpen(false);
    };

    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);

    const editingColumn = selectedTable?.columns.find(
        (column) => column.id === editingColumnId
    );

    const handleSaveColumn = (
        columnId: string,
        columnData: {
            name: string;
            type: string;
            size?: number;
            scale?: number;
            nullable: boolean;
            primaryKey: boolean;
        }
    ) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            updateColumn(
                currentProject,
                schema.id,
                selectedTableId,
                columnId,
                (currentColumn) => ({
                    ...currentColumn,
                    name: columnData.name,
                    type: columnData.type,
                    size: columnData.size,
                    scale: columnData.scale,
                    nullable: columnData.nullable,
                    primaryKey: columnData.primaryKey,
                })
            )
        );

        setEditingColumnId(null);
    };

    const handleDeleteColumn = (columnId: string) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            removeColumn(
                currentProject,
                schema.id,
                selectedTableId,
                columnId
            )
        );

        setEditingColumnId(null);
    };

    const [isAddForeignKeyModalOpen, setIsAddForeignKeyModalOpen] = useState(false);
    const handleCreateForeignKey = (foreignKeyData: {
        name: string;
        sourceColumn: string;
        targetSchema: string;
        targetTable: string;
        targetColumn: string;
        onUpdate: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
        onDelete: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
    }) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        const currentForeignKeyIds = new Set(
            schema.tables
                .find((table) => table.id === selectedTableId)
                ?.foreignKeys.map((foreignKey) => foreignKey.id) ?? []
        );

        const projectWithForeignKey = addForeignKey(
            project,
            schema.id,
            selectedTableId
        );

        const newForeignKey = projectWithForeignKey.schemas
            .flatMap((currentSchema) => currentSchema.tables)
            .find((table) => table.id === selectedTableId)
            ?.foreignKeys.find((foreignKey) => !currentForeignKeyIds.has(foreignKey.id));

        if (!newForeignKey) {
            return;
        }

        const nextProject = updateForeignKey(
            projectWithForeignKey,
            schema.id,
            selectedTableId,
            newForeignKey.id,
            (currentForeignKey) => ({
                ...currentForeignKey,
                name: foreignKeyData.name,
                sourceColumns: [foreignKeyData.sourceColumn],
                targetSchema: foreignKeyData.targetSchema,
                targetTable: foreignKeyData.targetTable,
                targetColumns: [foreignKeyData.targetColumn],
                onUpdate: foreignKeyData.onUpdate,
                onDelete: foreignKeyData.onDelete,
            })
        );

        setProject(nextProject);
        setIsAddForeignKeyModalOpen(false);
    };

    const [editingForeignKeyId, setEditingForeignKeyId] = useState<string | null>(null);
    const editingForeignKey = selectedTable?.foreignKeys.find(
        (foreignKey) => foreignKey.id === editingForeignKeyId
    );

    const handleSaveForeignKey = (
        foreignKeyId: string,
        foreignKeyData: {
            name: string;
            sourceColumn: string;
            targetSchema: string;
            targetTable: string;
            targetColumn: string;
            onUpdate: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
            onDelete: "NO ACTION" | "CASCADE" | "RESTRICT" | "SET NULL";
        }
    ) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            updateForeignKey(
                currentProject,
                schema.id,
                selectedTableId,
                foreignKeyId,
                (currentForeignKey) => ({
                    ...currentForeignKey,
                    name: foreignKeyData.name,
                    sourceColumns: [foreignKeyData.sourceColumn],
                    targetSchema: foreignKeyData.targetSchema,
                    targetTable: foreignKeyData.targetTable,
                    targetColumns: [foreignKeyData.targetColumn],
                    onUpdate: foreignKeyData.onUpdate,
                    onDelete: foreignKeyData.onDelete,
                })
            )
        );

        setEditingForeignKeyId(null);
    };

    const handleDeleteForeignKey = (foreignKeyId: string) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            removeForeignKey(
                currentProject,
                schema.id,
                selectedTableId,
                foreignKeyId
            )
        );

        setEditingForeignKeyId(null);
    };

    const [isAddUniqueConstraintModalOpen, setIsAddUniqueConstraintModalOpen] =
        useState(false);

    const [editingUniqueConstraintId, setEditingUniqueConstraintId] =
        useState<string | null>(null);

    const editingUniqueConstraint = selectedTable?.uniqueConstraints.find(
        (uniqueConstraint) => uniqueConstraint.id === editingUniqueConstraintId
    );

    const handleCreateUniqueConstraint = (uniqueConstraintData: {
        name: string;
        columns: string[];
    }) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        const currentUniqueConstraintIds = new Set(
            schema.tables
                .find((table) => table.id === selectedTableId)
                ?.uniqueConstraints.map((uniqueConstraint) => uniqueConstraint.id) ?? []
        );

        const projectWithUniqueConstraint = addUniqueConstraint(
            project,
            schema.id,
            selectedTableId
        );

        const newUniqueConstraint = projectWithUniqueConstraint.schemas
            .flatMap((currentSchema) => currentSchema.tables)
            .find((table) => table.id === selectedTableId)
            ?.uniqueConstraints.find(
                (uniqueConstraint) =>
                    !currentUniqueConstraintIds.has(uniqueConstraint.id)
            );

        if (!newUniqueConstraint) {
            return;
        }

        const nextProject = updateUniqueConstraint(
            projectWithUniqueConstraint,
            schema.id,
            selectedTableId,
            newUniqueConstraint.id,
            (currentUniqueConstraint) => ({
                ...currentUniqueConstraint,
                name: uniqueConstraintData.name,
                columns: uniqueConstraintData.columns,
            })
        );

        setProject(nextProject);
        setIsAddUniqueConstraintModalOpen(false);
    };

    const handleSaveUniqueConstraint = (
        uniqueConstraintId: string,
        uniqueConstraintData: {
            name: string;
            columns: string[];
        }
    ) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            updateUniqueConstraint(
                currentProject,
                schema.id,
                selectedTableId,
                uniqueConstraintId,
                (currentUniqueConstraint) => ({
                    ...currentUniqueConstraint,
                    name: uniqueConstraintData.name,
                    columns: uniqueConstraintData.columns,
                })
            )
        );

        setEditingUniqueConstraintId(null);
    };

    const handleDeleteUniqueConstraint = (uniqueConstraintId: string) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            removeUniqueConstraint(
                currentProject,
                schema.id,
                selectedTableId,
                uniqueConstraintId
            )
        );

        setEditingUniqueConstraintId(null);
    };

    const [isAddIndexModalOpen, setIsAddIndexModalOpen] = useState(false);
    const [editingIndexId, setEditingIndexId] = useState<string | null>(null);

    const editingIndex = selectedTable?.indexes.find(
        (index) => index.id === editingIndexId
    );

    const handleCreateIndex = (indexData: {
        name: string;
        columns: string[];
    }) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        const currentIndexIds = new Set(
            schema.tables
                .find((table) => table.id === selectedTableId)
                ?.indexes.map((index) => index.id) ?? []
        );

        const projectWithIndex = addIndex(project, schema.id, selectedTableId);

        const newIndex = projectWithIndex.schemas
            .flatMap((currentSchema) => currentSchema.tables)
            .find((table) => table.id === selectedTableId)
            ?.indexes.find((index) => !currentIndexIds.has(index.id));

        if (!newIndex) {
            return;
        }

        const nextProject = updateIndex(
            projectWithIndex,
            schema.id,
            selectedTableId,
            newIndex.id,
            (currentIndex) => ({
                ...currentIndex,
                name: indexData.name,
                columns: indexData.columns,
            })
        );

        setProject(nextProject);
        setIsAddIndexModalOpen(false);
    };

    const handleSaveIndex = (
        indexId: string,
        indexData: {
            name: string;
            columns: string[];
        }
    ) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            updateIndex(
                currentProject,
                schema.id,
                selectedTableId,
                indexId,
                (currentIndex) => ({
                    ...currentIndex,
                    name: indexData.name,
                    columns: indexData.columns,
                })
            )
        );

        setEditingIndexId(null);
    };

    const handleDeleteIndex = (indexId: string) => {
        if (!selectedTableId) {
            return;
        }

        const schema = project.schemas.find((currentSchema) =>
            currentSchema.tables.some((table) => table.id === selectedTableId)
        );

        if (!schema) {
            return;
        }

        setProject((currentProject) =>
            removeIndex(
                currentProject,
                schema.id,
                selectedTableId,
                indexId
            )
        );

        setEditingIndexId(null);
    };

    return (
        <ReactFlowProvider>
            <div className="canvas-page">

                <CanvasToolbar
                    onFitView={handleFitView}
                    onAddTable={handleAddTable}
                />

                {selectedTable && (
                    <CanvasInspector
                        table={selectedTable}
                        onClose={() => setSelectedTableId(null)}
                        onRenameTable={handleRenameTable}
                        onDeleteTable={handleDeleteTable}
                        onAddColumn={handleAddColumn}
                        onEditColumn={setEditingColumnId}
                        onAddForeignKey={() => setIsAddForeignKeyModalOpen(true)}
                        onEditForeignKey={setEditingForeignKeyId}
                        onAddUniqueConstraint={() => setIsAddUniqueConstraintModalOpen(true)}
                        onEditUniqueConstraint={setEditingUniqueConstraintId}
                        onAddIndex={() => setIsAddIndexModalOpen(true)}
                        onEditIndex={setEditingIndexId}
                    />
                )}

                {isAddColumnModalOpen && (
                    <AddColumnModal
                        existingColumnNames={selectedTable?.columns.map((column) => column.name) ?? []}
                        onClose={() => setIsAddColumnModalOpen(false)}
                        onCreateColumn={handleCreateColumn}
                    />
                )}

                {editingColumn && selectedTable && (
                    <EditColumnModal
                        column={editingColumn}
                        existingColumnNames={selectedTable.columns.map((column) => column.name)}
                        onClose={() => setEditingColumnId(null)}
                        onDeleteColumn={handleDeleteColumn}
                        onSaveColumn={handleSaveColumn}
                    />
                )}

                {isAddForeignKeyModalOpen && selectedTable && (
                    <AddForeignKeyModal
                        project={project}
                        sourceTable={selectedTable}
                        onClose={() => setIsAddForeignKeyModalOpen(false)}
                        onCreateForeignKey={handleCreateForeignKey}
                    />
                )}

                {editingForeignKey && selectedTable && (
                    <EditForeignKeyModal
                        project={project}
                        sourceTable={selectedTable}
                        foreignKey={editingForeignKey}
                        onClose={() => setEditingForeignKeyId(null)}
                        onDeleteForeignKey={handleDeleteForeignKey}
                        onSaveForeignKey={handleSaveForeignKey}
                    />
                )}

                {isAddUniqueConstraintModalOpen && selectedTable && (
                    <AddUniqueConstraintModal
                        table={selectedTable}
                        onClose={() => setIsAddUniqueConstraintModalOpen(false)}
                        onCreateUniqueConstraint={handleCreateUniqueConstraint}
                    />
                )}

                {editingUniqueConstraint && selectedTable && (
                    <EditUniqueConstraintModal
                        table={selectedTable}
                        uniqueConstraint={editingUniqueConstraint}
                        onClose={() => setEditingUniqueConstraintId(null)}
                        onDeleteUniqueConstraint={handleDeleteUniqueConstraint}
                        onSaveUniqueConstraint={handleSaveUniqueConstraint}
                    />
                )}

                {isAddIndexModalOpen && selectedTable && (
                    <AddIndexModal
                        table={selectedTable}
                        onClose={() => setIsAddIndexModalOpen(false)}
                        onCreateIndex={handleCreateIndex}
                    />
                )}

                {editingIndex && selectedTable && (
                    <EditIndexModal
                        table={selectedTable}
                        index={editingIndex}
                        onClose={() => setEditingIndexId(null)}
                        onDeleteIndex={handleDeleteIndex}
                        onSaveIndex={handleSaveIndex}
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
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodesConnectable={false}
                    elementsSelectable
                    fitView
                    fitViewOptions={{
                        padding: 0.35,
                        maxZoom: 0.85,
                    }}
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </ReactFlowProvider>
    );
}