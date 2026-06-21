import type { OnNodeDrag, Node as ReactFlowNode } from "@xyflow/react";
import {
    applyNodeChanges,
    Background,
    Controls,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    type NodeChange,
    type ReactFlowInstance
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DatabaseProject } from "../../core/model";
import {
    addColumn,
    addForeignKey,
    addIndex,
    addSequence,
    addTable,
    addUniqueConstraint,
    removeColumn,
    removeForeignKey,
    removeIndex,
    removeSchema,
    removeSequence,
    removeTable,
    removeUniqueConstraint,
    updateColumn,
    updateForeignKey,
    updateIndex,
    updateSchema,
    updateSequence,
    updateTable,
    updateTableNodePosition,
    updateUniqueConstraint
} from "../../core/model";
import { AddColumnModal } from "./AddColumnModal";
import { AddForeignKeyModal } from "./AddForeignKeyModal";
import { AddIndexModal } from "./AddIndexModal";
import { AddUniqueConstraintModal } from "./AddUniqueConstraintModal";
import "./Canvas.css";
import { CanvasInspector } from "./CanvasInspector";
import { CanvasSidebar } from "./CanvasSidebar";
import { CanvasToolbar } from "./CanvasToolbar";
import { DatabaseTableNode } from "./DatabaseTableNode";
import { EditColumnModal } from "./EditColumnModal";
import { EditForeignKeyModal } from "./EditForeignKeyModal";
import { EditIndexModal } from "./EditIndexModal";
import { EditUniqueConstraintModal } from "./EditUniqueConstraintModal";
import {
    mapProjectToFlow,
    mapProjectToFlowEdges,
} from "./mapProjectToFlow";
import { SchemaModal } from "./SchemaModal";
import { SequenceModal } from "./SequenceModal";

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

    const handleNodeDragStop: OnNodeDrag<ReactFlowNode> = (_event, node) => {
        setProject((currentProject) =>
            updateTableNodePosition(currentProject, node.id, node.position)
        );

        setSelectedTableId(node.id);

        setNodes((currentNodes) =>
            currentNodes.map((currentNode) => ({
                ...currentNode,
                selected: currentNode.id === node.id,
            }))
        );
    };

    const handleRenameProject = (name: string) => {
        setProject((currentProject) => ({
            ...currentProject,
            name,
        }));
    };

    const [isAddSchemaModalOpen, setIsAddSchemaModalOpen] = useState(false);
    const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null);

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const selectedTable = project.schemas
        .flatMap((schema) => schema.tables)
        .find((table) => table.id === selectedTableId);

    useEffect(() => {
        setNodes((currentNodes) =>
            currentNodes.map((node) => ({
                ...node,
                selected: node.id === selectedTableId,
            }))
        );
    }, [selectedTableId, setNodes]);

    const editingSchema = project.schemas.find(
        (schema) => schema.id === editingSchemaId
    );

    const handleCreateSchema = (name: string) => {
        setProject((currentProject) => ({
            ...currentProject,
            schemas: [
                ...currentProject.schemas,
                {
                    id: crypto.randomUUID(),
                    name,
                    sequences: [],
                    tables: [],
                },
            ],
        }));

        setIsAddSchemaModalOpen(false);
    };

    const handleSaveSchema = (name: string) => {
        if (!editingSchemaId) {
            return;
        }

        setProject((currentProject) =>
            updateSchema(
                currentProject,
                editingSchemaId,
                (currentSchema) => ({
                    ...currentSchema,
                    name,
                })
            )
        );

        setEditingSchemaId(null);
    };

    const handleDeleteSchema = (schemaId: string) => {
        const schema = project.schemas.find(
            (currentSchema) => currentSchema.id === schemaId
        );

        if (!schema) {
            return;
        }

        const confirmed = window.confirm(
            `Remove schema "${schema.name}"? This will remove its tables and sequences.`
        );

        if (!confirmed) {
            return;
        }

        setProject((currentProject) => removeSchema(currentProject, schemaId));

        if (
            selectedTableId &&
            schema.tables.some((table) => table.id === selectedTableId)
        ) {
            setSelectedTableId(null);
        }

        setEditingSchemaId(null);
    };

    const [addingSequenceSchemaId, setAddingSequenceSchemaId] = useState<string | null>(null);

    const [editingSequence, setEditingSequence] = useState<{
        schemaId: string;
        sequenceId: string;
    } | null>(null);

    const addingSequenceSchema = project.schemas.find(
        (schema) => schema.id === addingSequenceSchemaId
    );

    const editingSequenceSchema = project.schemas.find(
        (schema) => schema.id === editingSequence?.schemaId
    );

    const editingSequenceData = editingSequenceSchema?.sequences.find(
        (sequence) => sequence.id === editingSequence?.sequenceId
    );

    const handleCreateSequence = (sequenceData: {
        name: string;
        startWith: number;
        incrementBy: number;
    }) => {
        if (!addingSequenceSchemaId) {
            return;
        }

        const schema = project.schemas.find(
            (currentSchema) => currentSchema.id === addingSequenceSchemaId
        );

        if (!schema) {
            return;
        }

        const currentSequenceIds = new Set(
            schema.sequences.map((sequence) => sequence.id)
        );

        const projectWithSequence = addSequence(project, addingSequenceSchemaId);

        const newSequence = projectWithSequence.schemas
            .find((currentSchema) => currentSchema.id === addingSequenceSchemaId)
            ?.sequences.find((sequence) => !currentSequenceIds.has(sequence.id));

        if (!newSequence) {
            return;
        }

        const nextProject = updateSequence(
            projectWithSequence,
            addingSequenceSchemaId,
            newSequence.id,
            (currentSequence) => ({
                ...currentSequence,
                name: sequenceData.name,
                startWith: sequenceData.startWith,
                incrementBy: sequenceData.incrementBy,
            })
        );

        setProject(nextProject);
        setAddingSequenceSchemaId(null);
    };

    const handleSaveSequence = (sequenceData: {
        name: string;
        startWith: number;
        incrementBy: number;
    }) => {
        if (!editingSequence) {
            return;
        }

        setProject((currentProject) =>
            updateSequence(
                currentProject,
                editingSequence.schemaId,
                editingSequence.sequenceId,
                (currentSequence) => ({
                    ...currentSequence,
                    name: sequenceData.name,
                    startWith: sequenceData.startWith,
                    incrementBy: sequenceData.incrementBy,
                })
            )
        );

        setEditingSequence(null);
    };

    const handleDeleteSequence = (schemaId: string, sequenceId: string) => {
        const schema = project.schemas.find(
            (currentSchema) => currentSchema.id === schemaId
        );

        const sequence = schema?.sequences.find(
            (currentSequence) => currentSequence.id === sequenceId
        );

        if (!schema || !sequence) {
            return;
        }

        const confirmed = window.confirm(
            `Remove sequence "${sequence.name}"?`
        );

        if (!confirmed) {
            return;
        }

        setProject((currentProject) =>
            removeSequence(currentProject, schemaId, sequenceId)
        );

        setEditingSequence(null);
    };

    const handleSeeTableOnDiagram = (_schemaId: string, tableId: string) => {
        const tableNodeExists = project.diagram.tableNodes.some(
            (tableNode) => tableNode.tableId === tableId
        );

        if (!tableNodeExists) {
            setProject((currentProject) =>
                updateTableNodePosition(currentProject, tableId, {
                    x: 160,
                    y: 160,
                })
            );
        }

        setSelectedTableId(tableId);

        setNodes((currentNodes) =>
            currentNodes.map((node) => ({
                ...node,
                selected: node.id === tableId,
            }))
        );

        window.requestAnimationFrame(() => {
            reactFlowInstanceRef.current?.fitView({
                nodes: [{ id: tableId }],
                padding: 0.55,
                maxZoom: 0.95,
                duration: 300,
            });
        });
    };

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

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((currentNodes) =>
                applyNodeChanges(changes, currentNodes).map((node) => ({
                    ...node,
                    selected: node.id === selectedTableId,
                }))
            );
        },
        [setNodes, selectedTableId]
    );

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
        <div className="canvas-workspace">
            <CanvasSidebar
                project={project}
                onRenameProject={handleRenameProject}
                onAddSchema={() => setIsAddSchemaModalOpen(true)}
                onEditSchema={setEditingSchemaId}
                onDeleteSchema={handleDeleteSchema}
                onAddSequence={setAddingSequenceSchemaId}
                onEditSequence={(schemaId, sequenceId) =>
                    setEditingSequence({ schemaId, sequenceId })
                }
                onDeleteSequence={handleDeleteSequence}
                onSeeTableOnDiagram={handleSeeTableOnDiagram}
            />

            <div className="canvas-main">
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

                        {isAddSchemaModalOpen && (
                            <SchemaModal
                                title="Add schema"
                                existingSchemaNames={project.schemas.map((schema) => schema.name)}
                                onClose={() => setIsAddSchemaModalOpen(false)}
                                onSave={handleCreateSchema}
                            />
                        )}

                        {editingSchema && (
                            <SchemaModal
                                title={`Edit schema · ${editingSchema.name}`}
                                initialName={editingSchema.name}
                                existingSchemaNames={project.schemas.map((schema) => schema.name)}
                                onClose={() => setEditingSchemaId(null)}
                                onSave={handleSaveSchema}
                            />
                        )}

                        {addingSequenceSchema && (
                            <SequenceModal
                                title={`Add sequence · ${addingSequenceSchema.name}`}
                                existingSequenceNames={addingSequenceSchema.sequences.map(
                                    (sequence) => sequence.name
                                )}
                                onClose={() => setAddingSequenceSchemaId(null)}
                                onSave={handleCreateSequence}
                            />
                        )}

                        {editingSequenceSchema && editingSequenceData && (
                            <SequenceModal
                                title={`Edit sequence · ${editingSequenceData.name}`}
                                initialName={editingSequenceData.name}
                                initialStartWith={editingSequenceData.startWith}
                                initialIncrementBy={editingSequenceData.incrementBy}
                                existingSequenceNames={editingSequenceSchema.sequences.map(
                                    (sequence) => sequence.name
                                )}
                                onClose={() => setEditingSequence(null)}
                                onSave={handleSaveSequence}
                            />
                        )}

                        <ReactFlow
                            className="canvas-flow"
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodeDragStop={handleNodeDragStop}
                            onNodeClick={(_, node) => setSelectedTableId(node.id)}
                            onPaneClick={() => {
                                setSelectedTableId(null);

                                setNodes((currentNodes) =>
                                    currentNodes.map((node) => ({
                                        ...node,
                                        selected: false,
                                    }))
                                );
                            }}
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
                            <Controls showFitView={false} />
                        </ReactFlow>
                    </div>
                </ReactFlowProvider>
            </div>
        </div>
    );
}