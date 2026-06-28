import type { DatabaseSchema } from "@/core/model";
import {
  FileCode2,
  FilePlus2,
  FolderOpen,
  FolderX,
  Grid2X2Plus,
  Save,
  SaveAll,
  Scan,
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
  onExportJson?: () => void;
  onGenerateSql: () => void;
  schemas: DatabaseSchema[];
  activeSchemaId: string | null;
  onActiveSchemaChange: (schemaId: string | null) => void;
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
  onGenerateSql,
  schemas,
  activeSchemaId,
  onActiveSchemaChange,
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
          <FilePlus2 size={18} strokeWidth={2.4} color="oklch(71.4% 0.203 305.504)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Open project (Ctrl+O)"
          aria-label="Open project"
          onClick={onOpenProject}
          disabled={isFileOperationLoading}
        >
          <FolderOpen size={18} strokeWidth={2.4} color="oklch(75% 0.183 55.934)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Close project"
          aria-label="Close project"
          onClick={onCloseProject}
          disabled={isFileOperationLoading}
        >
          <FolderX size={18} strokeWidth={2.4} color="oklch(70.4% 0.191 22.216)" />
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
          <Save size={18} strokeWidth={2.4} color="oklch(62.3% 0.214 259.815)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Save as (Ctrl+Shift+S)"
          aria-label="Save as"
          onClick={onSaveProjectAs}
          disabled={isFileOperationLoading}
        >
          <SaveAll size={18} strokeWidth={2.4} color="oklch(58.8% 0.158 241.966)" />
        </button>

        <div className="canvas-toolbar__separator" aria-hidden="true" />

        <div className="canvas-toolbar__schema-select-container">
          <span className="canvas-toolbar__schema-select-label">Schema:</span>
          <select
            className="canvas-toolbar__schema-select"
            value={activeSchemaId || ""}
            onChange={(e) => onActiveSchemaChange(e.target.value || null)}
            disabled={schemas.length === 0}
          >
            {schemas.length === 0 ? (
              <option value="">No schemas</option>
            ) : (
              schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

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
          disabled={!activeSchemaId}
        >
          <Grid2X2Plus size={18} strokeWidth={2.4} color="oklch(76.5% 0.177 163.223)" />
        </button>

        <button
          className="canvas-toolbar__icon-button"
          type="button"
          title="Generate SQL"
          aria-label="Generate SQL"
          onClick={onGenerateSql}
          disabled={isFileOperationLoading}
        >
          <FileCode2 size={18} strokeWidth={2.4} color="oklch(89.7% 0.196 126.665)" />
        </button>
      </div>
    </div>
  );
}
