import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useEffect, useCallback } from "react";
import {
  createTable,
  findTableContext,
  findViewContext,
  createDatabaseView,
  updateDatabaseView,
  removeDatabaseView,
  removeSchema,
  removeSequence,
  removeTable,
  updateTable,
  moveTableSchema,
  removeDatabaseFunction,
  moveColumn,
  createSubjectArea,
  updateSubjectArea,
  removeSubjectArea,
  createTextNote,
  updateTextNote,
  removeTextNote,
  setTableSubjectArea,
  type DatabaseProject,
} from "@/core/model";
import { generatePostgresSql } from "@/core/sql/postgres-generator";
import { downloadFile } from "@/app/shared/files/download-file";
import { CanvasInspector } from "./components/CanvasInspector";
import { CanvasSidebar } from "./components/CanvasSidebar";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DatabaseTableNode } from "./components/DatabaseTableNode";
import { DatabaseViewNode } from "./components/DatabaseViewNode";
import { SubjectAreaNode } from "./components/SubjectAreaNode";
import { TextNoteNode } from "./components/TextNoteNode";
import { SmartRelationEdge } from "./components/SmartRelationEdge";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { CanvasDialogs } from "./dialogs/CanvasDialogs";
import type { CanvasDialogState } from "./dialogs/dialog-state";
import { useCanvasFlow } from "./hooks/useCanvasFlow";
import { useConfirm } from "./hooks/useConfirm";
import "./styles/Canvas.css";

type CanvasProps = {
  project: DatabaseProject;
  filePath: string | null;
  setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
  onNewProject: () => void;
  onOpenProject: () => void;
  onCloseProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  fileOperationMessage: string | null;
  beginFileOperation: (message: string) => boolean;
  finishFileOperation: () => void;
  onFileOperationError: (message: string) => void;
  onViewFlyway?: () => void;
};
const nodeTypes = {
  databaseTable: DatabaseTableNode,
  databaseView: DatabaseViewNode,
  subjectArea: SubjectAreaNode,
  textNote: TextNoteNode,
};
const edgeTypes = {
  smart: SmartRelationEdge,
};
const defaultEdgeOptions: ReactFlowProps["defaultEdgeOptions"] = {
  type: "smoothstep",
  style: { stroke: "#38bdf8", strokeWidth: 2 },
  labelStyle: { fill: "#cbd5e1", fontSize: 12, fontWeight: 600 },
  labelBgStyle: { fill: "#020617", fillOpacity: 0.9 },
};

export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
}

function CanvasContent({
  project,
  filePath,
  setProject,
  onNewProject,
  onOpenProject,
  onCloseProject,
  onSaveProject,
  onSaveProjectAs,
  fileOperationMessage,
  beginFileOperation,
  finishFileOperation,
  onFileOperationError,
  onViewFlyway,
}: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<CanvasDialogState>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [isAddingView, setIsAddingView] = useState(false);
  const [isAddingSubjectArea, setIsAddingSubjectArea] = useState(false);
  const [isAddingTextNote, setIsAddingTextNote] = useState(false);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
  const { confirm, requestConfirm, dismissConfirm, acceptConfirm } =
    useConfirm();

  const schemaIds = project.schemas.map((s) => s.id);
  if (schemaIds.length === 0) {
    if (activeSchemaId !== null) {
      setActiveSchemaId(null);
    }
  } else {
    if (activeSchemaId === null || !schemaIds.includes(activeSchemaId)) {
      setActiveSchemaId(schemaIds[0]);
    }
  }

  const context = selectedTableId
    ? findTableContext(project, selectedTableId)
    : undefined;

  const viewContext = selectedTableId
    ? findViewContext(project, selectedTableId)
    : undefined;

  const subjectAreaContext = selectedTableId
    ? (project.subjectAreas ?? []).find((area) => area.id === selectedTableId)
    : undefined;

  const textNoteContext = selectedTableId
    ? (project.textNotes ?? []).find((note) => note.id === selectedTableId)
    : undefined;

  const handleDoubleClickColumn = useCallback((tableId: string, columnId: string) => {
    setSelectedTableId(tableId);
    setDialog({ kind: "column", columnId });
  }, []);

  const handleUpdateSubjectAreaDimensions = useCallback((id: string, width: number, height: number) => {
    setProject((current) =>
      updateSubjectArea(current, id, (area) => ({ ...area, width, height })),
    );
  }, [setProject]);

  const handleUpdateTextNoteContent = useCallback((id: string, content: string) => {
    setProject((current) =>
      updateTextNote(current, id, (note) => ({ ...note, content })),
    );
  }, [setProject]);

  const handleUpdateTextNoteDimensions = useCallback((id: string, width: number, height: number) => {
    setProject((current) =>
      updateTextNote(current, id, (note) => ({ ...note, width, height })),
    );
  }, [setProject]);



  const flow = useCanvasFlow({
    project,
    setProject,
    selectedTableId,
    onSelectTable: setSelectedTableId,
    onDoubleClickColumn: handleDoubleClickColumn,
    onUpdateSubjectAreaDimensions: handleUpdateSubjectAreaDimensions,
    onUpdateTextNoteContent: handleUpdateTextNoteContent,
    onUpdateTextNoteDimensions: handleUpdateTextNoteDimensions,
  });

  useEffect(() => {
    if (!isAddingTable && !isAddingView && !isAddingSubjectArea && !isAddingTextNote) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddingTable(false);
        setIsAddingView(false);
        setIsAddingSubjectArea(false);
        setIsAddingTextNote(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddingTable, isAddingView, isAddingSubjectArea, isAddingTextNote]);

  const toggleAddTableMode = () => {
    if (!activeSchemaId) return;
    setIsAddingTable((prev) => {
      const next = !prev;
      if (next) {
        setIsAddingView(false);
        setIsAddingSubjectArea(false);
        setIsAddingTextNote(false);
      }
      return next;
    });
  };

  const toggleAddViewMode = () => {
    if (!activeSchemaId) return;
    setIsAddingView((prev) => {
      const next = !prev;
      if (next) {
        setIsAddingTable(false);
        setIsAddingSubjectArea(false);
        setIsAddingTextNote(false);
      }
      return next;
    });
  };

  const toggleAddSubjectAreaMode = () => {
    setIsAddingSubjectArea((prev) => {
      const next = !prev;
      if (next) {
        setIsAddingTable(false);
        setIsAddingView(false);
        setIsAddingTextNote(false);
      }
      return next;
    });
  };

  const toggleAddTextNoteMode = () => {
    setIsAddingTextNote((prev) => {
      const next = !prev;
      if (next) {
        setIsAddingTable(false);
        setIsAddingView(false);
        setIsAddingSubjectArea(false);
      }
      return next;
    });
  };

  const handlePaneClick = (event: React.MouseEvent) => {
    if (isAddingTable) {
      if (!activeSchemaId) {
        setIsAddingTable(false);
        return;
      }
      const schemaExists = project.schemas.some((s) => s.id === activeSchemaId);
      if (!schemaExists) {
        setIsAddingTable(false);
        setActiveSchemaId(project.schemas.length > 0 ? project.schemas[0].id : null);
        onFileOperationError("The selected schema no longer exists. Please select a valid schema.");
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const result = createTable(project, activeSchemaId, position);
      setProject(result.project);
      setSelectedTableId(result.id);
      setIsAddingTable(false);
    } else if (isAddingView) {
      if (!activeSchemaId) {
        setIsAddingView(false);
        return;
      }
      const schemaExists = project.schemas.some((s) => s.id === activeSchemaId);
      if (!schemaExists) {
        setIsAddingView(false);
        setActiveSchemaId(project.schemas.length > 0 ? project.schemas[0].id : null);
        onFileOperationError("The selected schema no longer exists. Please select a valid schema.");
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const result = createDatabaseView(project, activeSchemaId, position);
      setProject(result.project);
      setSelectedTableId(result.id);
      setIsAddingView(false);
    } else if (isAddingSubjectArea) {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setProject((current) =>
        createSubjectArea(current, {
          name: "New Subject Area",
          color: "#3b82f6",
          position,
          width: 300,
          height: 300,
        }),
      );
      setIsAddingSubjectArea(false);
    } else if (isAddingTextNote) {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setProject((current) =>
        createTextNote(current, {
          content: "New Text Note\nDouble-click to edit me!",
          color: "#eab308",
          position,
          width: 200,
          height: 150,
        }),
      );
      setIsAddingTextNote(false);
    } else {
      setSelectedTableId(null);
    }
  };
  const deleteTable = (schemaId: string, tableId: string) => {
    const schema = project.schemas.find((item) => item.id === schemaId);
    const table = schema?.tables.find((item) => item.id === tableId);
    if (!schema || !table) return;
    requestConfirm(`Remove table "${table.name}"?`, () => {
      setProject((current) =>
        removeTable(current, schema.id, table.id),
      );
      if (selectedTableId === table.id) {
        setSelectedTableId(null);
        setDialog(null);
      }
    });
  };
  const deleteView = (_schemaId: string, viewId: string) => {
    const view = project.views?.find((v) => v.id === viewId);
    if (!view) return;
    requestConfirm(`Remove view "${view.name}"?`, () => {
      setProject((current) => removeDatabaseView(current, viewId));
      if (selectedTableId === viewId) {
        setSelectedTableId(null);
        setDialog(null);
      }
    });
  };
  const deleteSchema = (schemaId: string) => {
    const schema = project.schemas.find((item) => item.id === schemaId);
    if (!schema) return;
    requestConfirm(
      `Remove schema "${schema.name}"? This will remove its tables and sequences.`,
      () => {
        setProject((current) => removeSchema(current, schemaId));
        if (
          selectedTableId &&
          schema.tables.some((table) => table.id === selectedTableId)
        )
          setSelectedTableId(null);
        setDialog(null);
      },
    );
  };
  const deleteSequence = (schemaId: string, sequenceId: string) => {
    const schema = project.schemas.find((item) => item.id === schemaId);
    const sequence = schema?.sequences.find((item) => item.id === sequenceId);
    if (!sequence) return;
    requestConfirm(`Remove sequence "${sequence.name}"?`, () => {
      setProject((current) => removeSequence(current, schemaId, sequenceId));
      setDialog(null);
    });
  };
  const deleteFunction = (_schemaId: string, functionId: string) => {
    const fn = (project.functions ?? []).find((item) => item.id === functionId);
    if (!fn) return;
    requestConfirm(`Remove function "${fn.name}"?`, () => {
      setProject((current) => removeDatabaseFunction(current, functionId));
    });
  };
  const download = async (kind: "json" | "sql") => {
    const message = kind === "json" ? "Exporting JSON..." : "Generating SQL...";
    if (!beginFileOperation(message)) return;

    try {
      await waitForNextPaint();
      if (kind === "json")
        downloadFile(
          "qube-modeler-project.json",
          JSON.stringify(project, null, 2),
          "application/json;charset=utf-8",
        );
      else
        downloadFile(
          "qube-modeler-project.sql",
          generatePostgresSql(project),
          "text/sql;charset=utf-8",
        );
    } catch (error) {
      onFileOperationError(
        `Could not ${kind === "json" ? "export JSON" : "generate SQL"}: ${getErrorMessage(error)}`,
      );
    } finally {
      finishFileOperation();
    }
  };

  return (
    <div className="canvas-workspace">
      <CanvasSidebar
        project={project}
        filePath={filePath}
        onAddSchema={() => setDialog({ kind: "schema" })}
        onEditSchema={(schemaId) => setDialog({ kind: "schema", schemaId })}
        onDeleteSchema={deleteSchema}
        onAddSequence={(schemaId) => setDialog({ kind: "sequence", schemaId })}
        onEditSequence={(schemaId, sequenceId) =>
          setDialog({ kind: "sequence", schemaId, sequenceId })
        }
        onDeleteSequence={deleteSequence}
        onAddFunction={(schemaId) => setDialog({ kind: "function", schemaId })}
        onEditFunction={(schemaId, functionId) =>
          setDialog({ kind: "function", schemaId, functionId })
        }
        onDeleteFunction={deleteFunction}
        onSeeTableOnDiagram={(_schemaId, tableId) => flow.focusTable(tableId)}
        onDeleteTable={deleteTable}
        onDeleteView={deleteView}
        onViewFlyway={onViewFlyway}
      />
      <main className="canvas-main">
        <CanvasToolbar
          onNewProject={onNewProject}
          onOpenProject={onOpenProject}
          onCloseProject={onCloseProject}
          onSaveProject={onSaveProject}
          onSaveProjectAs={onSaveProjectAs}
          isFileOperationLoading={fileOperationMessage !== null}
          onAddTable={toggleAddTableMode}
          isAddingTable={isAddingTable}
          onAddView={toggleAddViewMode}
          isAddingView={isAddingView}
          onFitView={flow.fitView}
          onExportJson={() => void download("json")}
          onGenerateSql={() => void download("sql")}
          schemas={project.schemas}
          activeSchemaId={activeSchemaId}
          onActiveSchemaChange={setActiveSchemaId}
          onAddSubjectArea={toggleAddSubjectAreaMode}
          onAddTextNote={toggleAddTextNoteMode}
          isAddingSubjectArea={isAddingSubjectArea}
          isAddingTextNote={isAddingTextNote}
        />
        {context && (
          <CanvasInspector
            table={context.table}
            onClose={() => setSelectedTableId(null)}
            schemas={project.schemas}
            currentSchemaId={context.schema.id}
            subjectAreas={project.subjectAreas}
            onSetSubjectArea={(subjectAreaId) =>
              setProject((current) =>
                setTableSubjectArea(
                  current,
                  context.schema.id,
                  context.table.id,
                  subjectAreaId,
                ),
              )
            }
            onChangeSchema={(schemaId) =>
              setProject((current) =>
                moveTableSchema(current, context.table.id, schemaId),
              )
            }
            onRenameTable={(name) =>
              setProject((current) =>
                updateTable(
                  current,
                  context.schema.id,
                  context.table.id,
                  (table) => ({ ...table, name }),
                ),
              )
            }
            onChangeTableComment={(comment) =>
              setProject((current) =>
                updateTable(
                  current,
                  context.schema.id,
                  context.table.id,
                  (table) => ({ ...table, comment: comment.trim() === "" ? undefined : comment }),
                ),
              )
            }
            onChangePrimaryKeyComment={(primaryKeyComment) =>
              setProject((current) =>
                updateTable(
                  current,
                  context.schema.id,
                  context.table.id,
                  (table) => ({ ...table, primaryKeyComment: primaryKeyComment.trim() === "" ? undefined : primaryKeyComment }),
                ),
              )
            }
            onDeleteTable={() =>
              deleteTable(context.schema.id, context.table.id)
            }
            onAddColumn={() => setDialog({ kind: "column" })}
            onEditColumn={(columnId) => setDialog({ kind: "column", columnId })}
            onMoveColumn={(columnId, direction) =>
              setProject((current) =>
                moveColumn(
                  current,
                  context.schema.id,
                  context.table.id,
                  columnId,
                  direction,
                ),
              )
            }
            onAddForeignKey={() => setDialog({ kind: "foreign-key" })}
            onEditForeignKey={(foreignKeyId) =>
              setDialog({ kind: "foreign-key", foreignKeyId })
            }
            onAddUniqueConstraint={() =>
              setDialog({ kind: "unique-constraint" })
            }
            onEditUniqueConstraint={(constraintId) =>
              setDialog({ kind: "unique-constraint", constraintId })
            }
            onAddIndex={() => setDialog({ kind: "index" })}
            onEditIndex={(indexId) => setDialog({ kind: "index", indexId })}
            onAddCheckConstraint={() => setDialog({ kind: "check-constraint" })}
            onEditCheckConstraint={(constraintId) =>
              setDialog({ kind: "check-constraint", constraintId })
            }
            onAddTrigger={() => setDialog({ kind: "trigger", parentId: context.table.id, parentType: "table" })}
            onEditTrigger={(triggerId) => setDialog({ kind: "trigger", triggerId, parentId: context.table.id, parentType: "table" })}
          />
        )}
        {viewContext && (
          <CanvasInspector
            view={viewContext.view}
            onClose={() => setSelectedTableId(null)}
            schemas={project.schemas}
            currentSchemaId={viewContext.schema.id}
            onChangeSchema={(schemaId) =>
              setProject((current) =>
                updateDatabaseView(current, viewContext.view.id, (view) => ({
                  ...view,
                  schemaId,
                })),
              )
            }
            onRenameView={(name) =>
              setProject((current) =>
                updateDatabaseView(current, viewContext.view.id, (view) => ({
                  ...view,
                  name,
                })),
              )
            }
            onChangeViewComment={(comment) =>
              setProject((current) =>
                updateDatabaseView(current, viewContext.view.id, (view) => ({
                  ...view,
                  comment: comment.trim() === "" ? undefined : comment,
                })),
              )
            }
            onEditViewDefinition={() =>
              setDialog({ kind: "view-definition", viewId: viewContext.view.id })
            }
            onToggleMaterialized={(isMaterialized) =>
              setProject((current) =>
                updateDatabaseView(current, viewContext.view.id, (view) => ({
                  ...view,
                  isMaterialized,
                  withNoData: isMaterialized ? view.withNoData : false,
                })),
              )
            }
            onToggleWithNoData={(withNoData) =>
              setProject((current) =>
                updateDatabaseView(current, viewContext.view.id, (view) => ({
                  ...view,
                  withNoData,
                })),
              )
            }
            onDeleteView={() => {
              requestConfirm(`Remove view "${viewContext.view.name}"?`, () => {
                setProject((current) => removeDatabaseView(current, viewContext.view.id));
                setSelectedTableId(null);
                setDialog(null);
              });
            }}
            onAddTrigger={() => setDialog({ kind: "trigger", parentId: viewContext.view.id, parentType: "view" })}
            onEditTrigger={(triggerId) => setDialog({ kind: "trigger", triggerId, parentId: viewContext.view.id, parentType: "view" })}
          />
        )}
        {subjectAreaContext && (
          <CanvasInspector
            subjectArea={subjectAreaContext}
            onClose={() => setSelectedTableId(null)}
            schemas={project.schemas}
            currentSchemaId=""
            onChangeSchema={() => {}}
            onRenameSubjectArea={(name) =>
              setProject((current) =>
                updateSubjectArea(current, subjectAreaContext.id, (area) => ({
                  ...area,
                  name,
                })),
              )
            }
            onChangeSubjectAreaColor={(color) =>
              setProject((current) =>
                updateSubjectArea(current, subjectAreaContext.id, (area) => ({
                  ...area,
                  color,
                })),
              )
            }
            onDeleteSubjectArea={() => {
              requestConfirm(
                `Remove subject area "${subjectAreaContext.name}"? Tables inside will not be deleted.`,
                () => {
                  setProject((current) =>
                    removeSubjectArea(current, subjectAreaContext.id),
                  );
                  setSelectedTableId(null);
                },
              );
            }}
          />
        )}
        {textNoteContext && (
          <CanvasInspector
            textNote={textNoteContext}
            onClose={() => setSelectedTableId(null)}
            schemas={project.schemas}
            currentSchemaId=""
            onChangeSchema={() => {}}
            onChangeTextNoteContent={(content) =>
              setProject((current) =>
                updateTextNote(current, textNoteContext.id, (note) => ({
                  ...note,
                  content,
                })),
              )
            }
            onChangeTextNoteColor={(color) =>
              setProject((current) =>
                updateTextNote(current, textNoteContext.id, (note) => ({
                  ...note,
                  color,
                })),
              )
            }
            onDeleteTextNote={() => {
              requestConfirm("Remove text note?", () => {
                setProject((current) =>
                  removeTextNote(current, textNoteContext.id),
                );
                setSelectedTableId(null);
              });
            }}
          />
        )}
        <CanvasDialogs
          dialog={dialog}
          setDialog={setDialog}
          project={project}
          setProject={setProject}
          selectedTableId={selectedTableId}
          requestConfirm={requestConfirm}
        />
        {confirm && (
          <ConfirmDialog
            message={confirm.message}
            confirmLabel={confirm.confirmLabel}
            onConfirm={acceptConfirm}
            onCancel={dismissConfirm}
          />
        )}
        <ReactFlow
          className={`canvas-flow ${isAddingTable ? "canvas-flow--adding-table" : ""} ${isAddingView ? "canvas-flow--adding-view" : ""} ${isAddingSubjectArea ? "canvas-flow--adding-subject-area" : ""} ${isAddingTextNote ? "canvas-flow--adding-text-note" : ""}`}
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeDragStop={flow.onNodeDragStop}
          onNodesDelete={(deletedNodes) => {
            setProject((current) => {
              let updated = current;
              for (const node of deletedNodes) {
                if (node.type === "subjectArea") {
                  updated = removeSubjectArea(updated, node.id);
                } else if (node.type === "textNote") {
                  updated = removeTextNote(updated, node.id);
                }
              }
              return updated;
            });
          }}
          onNodeClick={(_, node) => {
            if (isAddingTable) {
              setIsAddingTable(false);
            }
            if (isAddingView) {
              setIsAddingView(false);
            }
            if (isAddingSubjectArea) {
              setIsAddingSubjectArea(false);
            }
            if (isAddingTextNote) {
              setIsAddingTextNote(false);
            }
            setSelectedTableId(node.id);
          }}
          onEdgeDoubleClick={(_, edge) => {
            setSelectedTableId(edge.source);
            setDialog({ kind: "foreign-key", foreignKeyId: edge.id });
          }}
          onPaneClick={handlePaneClick}
          onInit={flow.onInit}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={flow.onNodesChange}
          onEdgesChange={flow.onEdgesChange}
          nodesConnectable={false}
          elementsSelectable
          fitView
          fitViewOptions={{ padding: 0.35, maxZoom: 0.85 }}
        >
          <Background />
          <Controls showFitView={false} />
        </ReactFlow>
      </main>
      {fileOperationMessage && (
        <LoadingOverlay message={fileOperationMessage} />
      )}
    </div>
  );
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => window.setTimeout(resolve, 0));
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
