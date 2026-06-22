import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useEffect } from "react";
import {
  createTable,
  findTableContext,
  removeSchema,
  removeSequence,
  removeTable,
  updateTable,
  type DatabaseProject,
} from "@/core/model";
import { generatePostgresSql } from "@/core/sql/postgres-generator";
import { downloadFile } from "@/app/shared/files/download-file";
import { CanvasInspector } from "./components/CanvasInspector";
import { CanvasSidebar } from "./components/CanvasSidebar";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DatabaseTableNode } from "./components/DatabaseTableNode";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { CanvasDialogs } from "./dialogs/CanvasDialogs";
import type { CanvasDialogState } from "./dialogs/dialog-state";
import { useCanvasFlow } from "./hooks/useCanvasFlow";
import { useConfirm } from "./hooks/useConfirm";
import "./styles/Canvas.css";

type CanvasProps = {
  project: DatabaseProject;
  setProject: React.Dispatch<React.SetStateAction<DatabaseProject>>;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  fileOperationMessage: string | null;
  beginFileOperation: (message: string) => boolean;
  finishFileOperation: () => void;
  onFileOperationError: (message: string) => void;
};
const nodeTypes = { databaseTable: DatabaseTableNode };
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
  setProject,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  fileOperationMessage,
  beginFileOperation,
  finishFileOperation,
  onFileOperationError,
}: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<CanvasDialogState>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const { confirm, requestConfirm, dismissConfirm, acceptConfirm } =
    useConfirm();
  const context = selectedTableId
    ? findTableContext(project, selectedTableId)
    : undefined;
  const flow = useCanvasFlow({
    project,
    setProject,
    selectedTableId,
    onSelectTable: setSelectedTableId,
  });

  useEffect(() => {
    if (!isAddingTable) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddingTable(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddingTable]);

  const toggleAddTableMode = () => {
    setIsAddingTable((prev) => !prev);
  };
  const handlePaneClick = (event: React.MouseEvent) => {
    if (isAddingTable) {
      const schema = project.schemas[0];
      if (!schema) {
        setIsAddingTable(false);
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const result = createTable(project, schema.id, position);
      setProject(result.project);
      setSelectedTableId(result.id);
      setIsAddingTable(false);
    } else {
      setSelectedTableId(null);
    }
  };
  const deleteTable = () => {
    if (!context) return;
    requestConfirm(`Remove table "${context.table.name}"?`, () => {
      setProject((current) =>
        removeTable(current, context.schema.id, context.table.id),
      );
      setSelectedTableId(null);
      setDialog(null);
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
          "V001__initial_schema.sql",
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
        onRenameProject={(name) =>
          setProject((current) => ({ ...current, name }))
        }
        onAddSchema={() => setDialog({ kind: "schema" })}
        onEditSchema={(schemaId) => setDialog({ kind: "schema", schemaId })}
        onDeleteSchema={deleteSchema}
        onAddSequence={(schemaId) => setDialog({ kind: "sequence", schemaId })}
        onEditSequence={(schemaId, sequenceId) =>
          setDialog({ kind: "sequence", schemaId, sequenceId })
        }
        onDeleteSequence={deleteSequence}
        onSeeTableOnDiagram={(_schemaId, tableId) => flow.focusTable(tableId)}
      />
      <main className="canvas-main">
        <CanvasToolbar
          onNewProject={onNewProject}
          onOpenProject={onOpenProject}
          onSaveProject={onSaveProject}
          onSaveProjectAs={onSaveProjectAs}
          isFileOperationLoading={fileOperationMessage !== null}
          onAddTable={toggleAddTableMode}
          isAddingTable={isAddingTable}
          onFitView={flow.fitView}
          onExportJson={() => void download("json")}
          onGenerateSql={() => void download("sql")}
        />
        {context && (
          <CanvasInspector
            table={context.table}
            onClose={() => setSelectedTableId(null)}
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
            onDeleteTable={deleteTable}
            onAddColumn={() => setDialog({ kind: "column" })}
            onEditColumn={(columnId) => setDialog({ kind: "column", columnId })}
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
          className={`canvas-flow ${isAddingTable ? "canvas-flow--adding-table" : ""}`}
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={nodeTypes}
          onNodeDragStop={flow.onNodeDragStop}
          onNodeClick={(_, node) => {
            if (isAddingTable) {
              setIsAddingTable(false);
            }
            setSelectedTableId(node.id);
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
