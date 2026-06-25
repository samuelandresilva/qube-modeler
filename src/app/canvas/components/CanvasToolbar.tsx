import {
  FileCode2,
  FilePlus2,
  FolderOpen,
  FolderX,
  Grid2X2Plus,
  Save,
  SaveAll,
  Scan
} from "lucide-react";

export type CanvasToolbarProps = {
  onNewProject: () => void;
  onOpenProject: () => void;
  onCloseProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  isFileOperationLoading: boolean;
  onFitView: () => void;
  onAddTable: () => void;
  isAddingTable: boolean;
  onExportJson: () => void;
  onGenerateSql: () => void;
};

export function CanvasToolbar({
  onNewProject,
  onOpenProject,
  onCloseProject,
  onSaveProject,
  onSaveProjectAs,
  isFileOperationLoading,
  onFitView,
  onAddTable,
  isAddingTable,
  onExportJson,
  onGenerateSql,
}: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar">
      <div className="canvas-toolbar__actions">
        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="New project"
          aria-label="New project"
          onClick={onNewProject}
          disabled={isFileOperationLoading}
        >
          <FilePlus2 size={18} strokeWidth={2.4} />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Open project (Ctrl+O)"
          aria-label="Open project"
          onClick={onOpenProject}
          disabled={isFileOperationLoading}
        >
          <FolderOpen size={18} strokeWidth={2.4} />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Close project"
          aria-label="Close project"
          onClick={onCloseProject}
          disabled={isFileOperationLoading}
        >
          <FolderX size={18} strokeWidth={2.4} />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Save project (Ctrl+S)"
          aria-label="Save project"
          onClick={onSaveProject}
          disabled={isFileOperationLoading}
        >
          <Save size={18} strokeWidth={2.4} />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Save as (Ctrl+Shift+S)"
          aria-label="Save as"
          onClick={onSaveProjectAs}
          disabled={isFileOperationLoading}
        >
          <SaveAll size={18} strokeWidth={2.4} />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Fit view"
          aria-label="Fit view"
          onClick={onFitView}
        >
          <Scan size={17} strokeWidth={2.4} />
        </button>

        <button
          className={`canvas-toolbar__icon-button ${isAddingTable ? "canvas-toolbar__button--active" : ""}`}
          type="button"
          title="Add table"
          aria-label="Add table"
          onClick={onAddTable}
        >
          <Grid2X2Plus size={18} strokeWidth={2.4} />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Generate SQL"
          aria-label="Generate SQL"
          onClick={onGenerateSql}
          disabled={isFileOperationLoading}
        >
          <FileCode2 size={18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
